import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { env } from '../config/env.js';
import { Booking } from '../models/booking.model.js';
import { Parking } from '../models/parking.model.js';
import { createNotification } from './notification.service.js';
import { serializeBooking, isFutureBooking } from './booking.service.js';
import { increaseAvailableSlots } from './slot.service.js';
import { createHttpError } from '../utils/createHttpError.js';

export async function createOrder(amount) {
  const amountInPaise = Math.round(Number(amount) * 100);

  if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) {
    throw createHttpError(400, 'Invalid payment amount');
  }

  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw createHttpError(503, 'Payment gateway is not configured');
  }

  const razorpay = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET
  });

  return razorpay.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: `smartpark_${Date.now()}`
  });
}

export async function fetchOrder(orderId) {
  if (!orderId) {
    throw createHttpError(400, 'Payment order ID is required');
  }

  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw createHttpError(503, 'Payment gateway is not configured');
  }

  const razorpay = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET
  });

  return razorpay.orders.fetch(orderId);
}

export function verifySignature(orderId, paymentId, signature) {
  if (!orderId || !paymentId || !signature || !env.RAZORPAY_KEY_SECRET) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function verifyWebhookSignature(payload, signature) {
  if (!payload || !signature || !env.RAZORPAY_WEBHOOK_SECRET) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function createPaymentOrder(input, user, deps = {}) {
  const BookingModel = deps.BookingModel ?? Booking;
  const ParkingModel = deps.ParkingModel ?? Parking;
  const createRazorpayOrder = deps.createOrder ?? createOrder;
  const booking = await findPayableBooking(BookingModel, ParkingModel, input.bookingId, user);

  if (booking.paymentStatus === 'paid') {
    throw createHttpError(400, 'Booking already paid');
  }

  if (booking.status !== 'pending') {
    throw createHttpError(409, 'Only pending bookings can be paid');
  }

  if (booking.razorpayOrderId) {
    throw createHttpError(409, 'Payment order already created');
  }

  if (env.ALLOW_TEST_PAYMENT && input.coupon === env.TEST_COUPON_CODE) {
    booking.isTestPayment = true;
    await markBookingPaid(booking, deps);

    return {
      success: true,
      testPayment: true,
      booking: serializeBooking(booking)
    };
  }

  const order = await createRazorpayOrder(booking.totalAmount);
  booking.razorpayOrderId = order.id;
  await booking.save();

  return {
    success: true,
    testPayment: false,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: env.RAZORPAY_KEY_ID,
    booking: serializeBooking(booking)
  };
}

export async function verifyPayment(input, user, deps = {}) {
  const BookingModel = deps.BookingModel ?? Booking;
  const ParkingModel = deps.ParkingModel ?? Parking;
  const verify = deps.verifySignature ?? verifySignature;
  const getOrder = deps.fetchOrder ?? fetchOrder;
  const booking = await findPayableBooking(BookingModel, ParkingModel, input.bookingId, user);

  if (booking.paymentStatus === 'paid') {
    return {
      success: true,
      message: 'Already verified',
      booking: serializeBooking(booking)
    };
  }

  // Reject payment if the booking start time has already passed.
  if (!isFutureBooking(booking.bookingDate, booking.startTime)) {
    await cancelPendingBooking(booking, ParkingModel, 'failed');
    throw createHttpError(400, 'Booking time expired before payment');
  }

  logPaymentVerification(input);

  if (booking.razorpayOrderId && booking.razorpayOrderId !== input.razorpay_order_id) {
    throw createHttpError(400, 'Payment order mismatch');
  }

  const razorpayOrder = await getOrder(input.razorpay_order_id);
  validatePaymentAmount(booking, razorpayOrder);

  const isValid = verify(
    input.razorpay_order_id,
    input.razorpay_payment_id,
    input.razorpay_signature
  );

  if (isValid) {
    booking.razorpayOrderId = input.razorpay_order_id;
    booking.razorpayPaymentId = input.razorpay_payment_id;
    await markBookingPaid(booking, deps);

    return {
      success: true,
      booking: serializeBooking(booking)
    };
  }

  booking.razorpayOrderId = input.razorpay_order_id;
  booking.razorpayPaymentId = input.razorpay_payment_id;
  await cancelPendingBooking(booking, ParkingModel, 'failed');

  return {
    success: false,
    booking: serializeBooking(booking)
  };
}

export async function handlePaymentWebhook(payload, signature, deps = {}) {
  const verifyWebhook = deps.verifyWebhookSignature ?? verifyWebhookSignature;

  if (!verifyWebhook(payload, signature)) {
    throw createHttpError(400, 'Invalid webhook signature');
  }

  let event;

  try {
    event = JSON.parse(payload);
  } catch {
    throw createHttpError(400, 'Invalid webhook payload');
  }

  const payment = event.payload?.payment?.entity;

  if (event.event !== 'payment.captured' || !payment?.order_id) {
    return { success: true, ignored: true };
  }

  const BookingModel = deps.BookingModel ?? Booking;
  const ParkingModel = deps.ParkingModel ?? Parking;
  const booking = await BookingModel.findOne({ razorpayOrderId: payment.order_id });

  if (!booking) {
    return { success: true, ignored: true };
  }

  if (booking.paymentStatus === 'paid') {
    return {
      success: true,
      message: 'Already verified',
      booking: serializeBooking(booking)
    };
  }

  await expirePendingBookingIfNeeded(booking, ParkingModel);

  if (booking.status !== 'pending' || booking.paymentStatus !== 'pending') {
    return { success: true, ignored: true };
  }

  validatePaymentAmount(booking, { amount: payment.amount });
  booking.razorpayPaymentId = payment.id;
  await markBookingPaid(booking, deps);

  return {
    success: true,
    booking: serializeBooking(booking)
  };
}

async function findPayableBooking(BookingModel, ParkingModel, bookingId, user) {
  if (!bookingId) {
    throw createHttpError(400, 'Booking ID is required');
  }

  const booking = await BookingModel.findById(bookingId);

  if (!booking) {
    throw createHttpError(404, 'Booking not found');
  }

  if (user && booking.user.toString() !== user._id.toString()) {
    throw createHttpError(403, 'You do not have permission to pay for this booking');
  }

  await expirePendingBookingIfNeeded(booking, ParkingModel);

  if (booking.status === 'cancelled' || booking.status === 'completed') {
    throw createHttpError(409, 'This booking cannot be paid');
  }

  return booking;
}

async function expirePendingBookingIfNeeded(booking, ParkingModel) {
  if (
    booking.paymentStatus === 'pending' &&
    booking.status === 'pending' &&
    booking.paymentExpiresAt &&
    Date.now() > new Date(booking.paymentExpiresAt).getTime()
  ) {
    await cancelPendingBooking(booking, ParkingModel, 'failed');
    throw createHttpError(409, 'Payment window expired');
  }
}

async function cancelPendingBooking(booking, ParkingModel, paymentStatus = 'failed') {
  const shouldRestoreSlots = booking.status === 'pending';
  booking.paymentStatus = paymentStatus;
  booking.status = 'cancelled';
  booking.cancelledBy = 'system';
  await booking.save();

  if (shouldRestoreSlots) {
    await increaseAvailableSlots(booking.parking, booking.slotCount, { ParkingModel });
    console.log('Booking Cancelled');
  }
}

async function markBookingPaid(booking, deps = {}) {
  booking.paymentStatus = 'paid';
  booking.status = 'confirmed';
  await booking.save();
  await notifyBookingConfirmed(booking, deps);
}

function validatePaymentAmount(booking, razorpayOrder) {
  const expectedAmount = Math.round(Number(booking.totalAmount) * 100);

  if (!razorpayOrder || Number(razorpayOrder.amount) !== expectedAmount) {
    throw createHttpError(400, 'Payment amount mismatch');
  }
}

function logPaymentVerification(input) {
  if (env.NODE_ENV === 'development') {
    console.log('Payment verification:', {
      bookingId: input.bookingId,
      orderId: input.razorpay_order_id,
      paymentId: input.razorpay_payment_id
    });
  }
}

async function notifyBookingConfirmed(booking, deps = {}) {
  const ParkingModel = deps.ParkingModel ?? Parking;
  const notify = deps.createNotification ?? createNotification;
  const parking = await ParkingModel.findById(booking.parking).select('owner title').lean();

  if (!parking) {
    return;
  }

  const date = booking.bookingDate;
  const startTime = booking.startTime;
  const endTime = booking.endTime;

  await Promise.allSettled([
    notify(
      booking.user,
      'driver',
      'booking_confirmed',
      `Your booking at ${parking.title} on ${date} from ${startTime} to ${endTime} is confirmed.`
    ),
    parking.owner
      ? notify(
          parking.owner,
          'owner',
          'new_booking',
          `New booking received for "${parking.title}" on ${date} from ${startTime} to ${endTime}.`
        )
      : Promise.resolve()
  ]);
}
