import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  createPaymentOrder,
  handlePaymentWebhook,
  verifyPayment,
  verifySignature,
  verifyWebhookSignature
} from './payment.service.js';
import { env } from '../config/env.js';

const userId = '507f1f77bcf86cd799439021';
const otherUserId = '507f1f77bcf86cd799439022';
const bookingId = '507f1f77bcf86cd799439024';
const parkingId = '507f1f77bcf86cd799439023';

test('valid test coupon marks booking paid and confirmed', async () => {
  withPaymentEnv({ allowTestPayment: true, testCouponCode: 'FREE100' });
  const booking = makeBooking();

  const result = await createPaymentOrder(
    { bookingId, coupon: 'FREE100' },
    makeUser(userId),
    {
      BookingModel: makeBookingModel(booking),
      ParkingModel: makeParkingModel(),
      createNotification: async () => {}
    }
  );

  assert.equal(result.testPayment, true);
  assert.equal(result.booking.paymentStatus, 'paid');
  assert.equal(result.booking.isTestPayment, true);
  assert.equal(result.booking.status, 'confirmed');
});

test('invalid coupon requires Razorpay order instead of marking paid', async () => {
  withPaymentEnv({ allowTestPayment: true, testCouponCode: 'FREE100', keyId: 'key_test' });
  const booking = makeBooking();

  const result = await createPaymentOrder(
    { bookingId, coupon: 'WRONG' },
    makeUser(userId),
    {
      BookingModel: makeBookingModel(booking),
      createOrder: async (amount) => ({
        id: 'order_123',
        amount: amount * 100,
        currency: 'INR'
      })
    }
  );

  assert.equal(result.testPayment, false);
  assert.equal(result.orderId, 'order_123');
  assert.equal(booking.razorpayOrderId, 'order_123');
  assert.equal(booking.paymentStatus, 'pending');
  assert.equal(booking.status, 'pending');
});

test('double-click payment order creation is blocked after an order exists', async () => {
  withPaymentEnv({ keyId: 'key_test' });

  await assert.rejects(
    () =>
      createPaymentOrder(
        { bookingId },
        makeUser(userId),
        { BookingModel: makeBookingModel(makeBooking({ razorpayOrderId: 'order_existing' })) }
      ),
    /already created/
  );
});

test('paid booking cannot create another payment order', async () => {
  await assert.rejects(
    () =>
      createPaymentOrder(
        { bookingId },
        makeUser(userId),
        { BookingModel: makeBookingModel(makeBooking({ status: 'confirmed', paymentStatus: 'paid' })) }
      ),
    /already paid/
  );
});

test('valid Razorpay signature marks booking paid and confirmed', async () => {
  const booking = makeBooking({ razorpayOrderId: 'order_123' });

  const result = await verifyPayment(
    {
      bookingId,
      razorpay_order_id: 'order_123',
      razorpay_payment_id: 'pay_123',
      razorpay_signature: 'valid'
    },
    makeUser(userId),
    {
      BookingModel: makeBookingModel(booking),
      fetchOrder: async () => ({ amount: 20000 }),
      verifySignature: () => true,
      ParkingModel: makeParkingModel(),
      createNotification: async () => {}
    }
  );

  assert.equal(result.success, true);
  assert.equal(result.booking.paymentStatus, 'paid');
  assert.equal(result.booking.status, 'confirmed');
  assert.equal(booking.razorpayPaymentId, 'pay_123');
});

test('invalid Razorpay signature fails payment and does not confirm booking', async () => {
  const booking = makeBooking({ razorpayOrderId: 'order_123' });
  let restoredSlots = 0;

  const result = await verifyPayment(
    {
      bookingId,
      razorpay_order_id: 'order_123',
      razorpay_payment_id: 'pay_123',
      razorpay_signature: 'invalid'
    },
    makeUser(userId),
    {
      BookingModel: makeBookingModel(booking),
      fetchOrder: async () => ({ amount: 20000 }),
      verifySignature: () => false,
      ParkingModel: makeParkingModel((update) => {
        restoredSlots = update.$inc.availableSlots;
      })
    }
  );

  assert.equal(result.success, false);
  assert.equal(result.booking.paymentStatus, 'failed');
  assert.equal(result.booking.status, 'cancelled');
  assert.equal(restoredSlots, 2);
});

test('wrong Razorpay order amount is rejected', async () => {
  const booking = makeBooking({ razorpayOrderId: 'order_123' });

  await assert.rejects(
    () =>
      verifyPayment(
        {
          bookingId,
          razorpay_order_id: 'order_123',
          razorpay_payment_id: 'pay_123',
          razorpay_signature: 'valid'
        },
        makeUser(userId),
        {
          BookingModel: makeBookingModel(booking),
          fetchOrder: async () => ({ amount: 100 }),
          verifySignature: () => true
        }
      ),
    /amount mismatch/
  );

  assert.equal(booking.paymentStatus, 'pending');
  assert.equal(booking.status, 'pending');
});

test('expired pending booking is cancelled and slots are restored', async () => {
  const booking = makeBooking({
    paymentExpiresAt: new Date(Date.now() - 1000)
  });
  let restoredSlots = 0;

  await assert.rejects(
    () =>
      createPaymentOrder(
        { bookingId },
        makeUser(userId),
        {
          BookingModel: makeBookingModel(booking),
          ParkingModel: makeParkingModel((update) => {
            restoredSlots = update.$inc.availableSlots;
          })
        }
      ),
    /Payment window expired/
  );

  assert.equal(booking.status, 'cancelled');
  assert.equal(booking.paymentStatus, 'failed');
  assert.equal(restoredSlots, 2);
});

test('paid booking verification is idempotent', async () => {
  const booking = makeBooking({
    status: 'confirmed',
    paymentStatus: 'paid'
  });

  const result = await verifyPayment(
    {
      bookingId,
      razorpay_order_id: 'order_123',
      razorpay_payment_id: 'pay_123',
      razorpay_signature: 'invalid_retry'
    },
    makeUser(userId),
    {
      BookingModel: makeBookingModel(booking),
      verifySignature: () => false
    }
  );

  assert.equal(result.success, true);
  assert.equal(result.message, 'Already verified');
  assert.equal(result.booking.paymentStatus, 'paid');
  assert.equal(result.booking.status, 'confirmed');
});

test('verifySignature accepts only the expected HMAC', () => {
  withPaymentEnv({ secret: 'secret' });
  const signature = crypto
    .createHmac('sha256', 'secret')
    .update('order_123|pay_123')
    .digest('hex');

  assert.equal(verifySignature('order_123', 'pay_123', signature), true);
  assert.equal(verifySignature('order_123', 'pay_123', 'bad'), false);
});

test('verifyWebhookSignature accepts only the expected HMAC', () => {
  withPaymentEnv({ webhookSecret: 'webhook_secret' });
  const payload = JSON.stringify({ event: 'payment.captured' });
  const signature = crypto
    .createHmac('sha256', 'webhook_secret')
    .update(payload)
    .digest('hex');

  assert.equal(verifyWebhookSignature(payload, signature), true);
  assert.equal(verifyWebhookSignature(payload, 'bad'), false);
});

test('payment webhook confirms pending booking by Razorpay order ID', async () => {
  const booking = makeBooking({ razorpayOrderId: 'order_123' });
  const payload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_123',
          order_id: 'order_123',
          amount: 20000
        }
      }
    }
  });

  const result = await handlePaymentWebhook(payload, 'signature', {
    verifyWebhookSignature: () => true,
    BookingModel: makeBookingFindOneModel(booking),
    ParkingModel: makeParkingModel(),
    createNotification: async () => {}
  });

  assert.equal(result.success, true);
  assert.equal(result.booking.paymentStatus, 'paid');
  assert.equal(result.booking.status, 'confirmed');
  assert.equal(booking.razorpayPaymentId, 'pay_123');
});

test('users cannot pay for another user booking', async () => {
  await assert.rejects(
    () =>
      createPaymentOrder(
        { bookingId },
        makeUser(userId),
        { BookingModel: makeBookingModel(makeBooking({ user: otherUserId })) }
      ),
    /permission/
  );
});

function withPaymentEnv({ allowTestPayment = false, testCouponCode = '', keyId = '', secret = 'secret', webhookSecret = '' } = {}) {
  env.ALLOW_TEST_PAYMENT = allowTestPayment;
  env.TEST_COUPON_CODE = testCouponCode;
  env.RAZORPAY_KEY_ID = keyId;
  env.RAZORPAY_KEY_SECRET = secret;
  env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;
}

function makeUser(id) {
  return {
    _id: {
      toString: () => id
    }
  };
}

function makeBooking(overrides = {}) {
  return {
    _id: {
      toString: () => bookingId
    },
    user: {
      toString: () => overrides.user ?? userId
    },
    parking: {
      toString: () => parkingId
    },
    vehicleType: '4-wheeler',
    bookingDate: '2026-05-05',
    startTime: '09:00',
    endTime: '11:00',
    slotCount: 2,
    totalAmount: 200,
    status: overrides.status ?? 'pending',
    paymentStatus: overrides.paymentStatus ?? 'pending',
    isTestPayment: overrides.isTestPayment ?? false,
    razorpayOrderId: overrides.razorpayOrderId ?? '',
    razorpayPaymentId: overrides.razorpayPaymentId ?? '',
    paymentExpiresAt: overrides.paymentExpiresAt ?? new Date(Date.now() + 10 * 60 * 1000),
    createdAt: new Date('2026-05-05T00:00:00.000Z'),
    updatedAt: new Date('2026-05-05T00:00:00.000Z'),
    async save() {
      return this;
    }
  };
}

function makeBookingModel(booking) {
  return {
    async findById() {
      return booking;
    }
  };
}

function makeBookingFindOneModel(booking) {
  return {
    async findOne() {
      return booking;
    }
  };
}

function makeParkingModel(onUpdate = () => {}) {
  return {
    findById() {
      return {
        select() {
          return {
            lean: async () => ({
              owner: '507f1f77bcf86cd799439099',
              title: 'Central Parking'
            })
          };
        }
      };
    },
    async findByIdAndUpdate(_id, update) {
      onUpdate(update);
    }
  };
}
