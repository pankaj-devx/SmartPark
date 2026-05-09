import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { env } from '../config/env.js';
import { Booking } from '../models/booking.model.js';
import { Parking } from '../models/parking.model.js';
import { createNotification } from './notification.service.js';
import {
  buildBookingOverlapFilter,
  calculateTotalAmount,
  createConfirmedBooking,
  isFutureBooking,
  serializeBooking
} from './booking.service.js';
import { createHttpError } from '../utils/createHttpError.js';
import {
  formatValidationErrors,
  validatePaymentBookingInput,
  validateSlotAvailability
} from '../utils/bookingValidation.js';

export async function createOrder(amount, options = {}) {
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
    receipt: options.receipt ?? `smartpark_${Date.now()}`,
    notes: options.notes
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
  const bookingInput = normalizeBookingInput(input);
  const parking = await validatePaymentBookingRequest(BookingModel, ParkingModel, bookingInput, user);
  const totalAmount = calculateTotalAmount(parking, bookingInput);

  if (env.ALLOW_TEST_PAYMENT && input.coupon === env.TEST_COUPON_CODE) {
    const booking = await createConfirmedPaidBooking(bookingInput, user, {
      ...deps,
      BookingModel,
      ParkingModel,
      isTestPayment: true,
      paymentStatus: 'paid',
      status: 'confirmed',
      bookingStatus: 'confirmed'
    });

    return {
      success: true,
      testPayment: true,
      booking
    };
  }

  const order = await createRazorpayOrder(totalAmount, {
    receipt: `smartpark_${Date.now()}`,
    notes: buildOrderNotes(bookingInput, user, totalAmount)
  });

  return {
    success: true,
    testPayment: false,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: env.RAZORPAY_KEY_ID,
    bookingDraft: {
      ...bookingInput,
      totalAmount
    }
  };
}

export async function verifyPayment(input, user, deps = {}) {
  const BookingModel = deps.BookingModel ?? Booking;
  const ParkingModel = deps.ParkingModel ?? Parking;
  const verify = deps.verifySignature ?? verifySignature;
  const getOrder = deps.fetchOrder ?? fetchOrder;
  const existingBooking = await BookingModel.findOne?.({ razorpayOrderId: input.razorpay_order_id });

  if (existingBooking?.paymentStatus === 'paid') {
    return {
      success: true,
      message: 'Already verified',
      booking: serializeBooking(existingBooking)
    };
  }

  logPaymentVerification(input);

  const razorpayOrder = await getOrder(input.razorpay_order_id);
  const bookingInput = extractBookingInputFromOrder(razorpayOrder, input);
  const orderUserId = getOrderNote(razorpayOrder, 'userId');

  if (user && orderUserId && orderUserId !== user._id.toString()) {
    throw createHttpError(403, 'You do not have permission to verify this payment');
  }

  if (!isFutureBooking(bookingInput.bookingDate, bookingInput.startTime)) {
    throw createHttpError(400, 'Booking time expired before payment');
  }

  const isValid = verify(
    input.razorpay_order_id,
    input.razorpay_payment_id,
    input.razorpay_signature
  );

  if (!isValid) {
    return {
      success: false,
      message: 'Payment verification failed'
    };
  }

  const parking = await validatePaymentBookingRequest(BookingModel, ParkingModel, bookingInput, user);
  validatePaymentAmount(calculateTotalAmount(parking, bookingInput), razorpayOrder);
  const booking = await createConfirmedPaidBookingIdempotently(
    bookingInput,
    user,
    input.razorpay_order_id,
    {
      ...deps,
      BookingModel,
      ParkingModel,
      razorpayOrderId: input.razorpay_order_id,
      razorpayPaymentId: input.razorpay_payment_id,
      paymentStatus: 'paid',
      status: 'confirmed',
      bookingStatus: 'confirmed'
    }
  );

  return {
    success: true,
    booking
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
  const getOrder = deps.fetchOrder ?? fetchOrder;
  const booking = await BookingModel.findOne({ razorpayOrderId: payment.order_id });

  if (booking?.paymentStatus === 'paid') {
    return {
      success: true,
      message: 'Already verified',
      booking: serializeBooking(booking)
    };
  }

  const razorpayOrder = payment.notes?.parking
    ? { notes: payment.notes, amount: payment.amount }
    : await getOrder(payment.order_id);
  const bookingInput = extractBookingInputFromOrder(razorpayOrder, { razorpay_order_id: payment.order_id });
  const userId = getOrderNote(razorpayOrder, 'userId');

  if (!userId) {
    return { success: true, ignored: true };
  }

  const webhookUser = { _id: { toString: () => userId }, role: 'driver' };
  const parking = await validatePaymentBookingRequest(BookingModel, ParkingModel, bookingInput, webhookUser);
  validatePaymentAmount(calculateTotalAmount(parking, bookingInput), { amount: payment.amount });
  const confirmedBooking = await createConfirmedPaidBookingIdempotently(
    bookingInput,
    webhookUser,
    payment.order_id,
    {
      ...deps,
      BookingModel,
      ParkingModel,
      razorpayOrderId: payment.order_id,
      razorpayPaymentId: payment.id,
      paymentStatus: 'paid',
      status: 'confirmed',
      bookingStatus: 'confirmed'
    }
  );

  return {
    success: true,
    booking: confirmedBooking
  };
}

async function createConfirmedPaidBooking(bookingInput, user, deps = {}) {
  const booking = await createConfirmedBooking(bookingInput, user, deps);
  await notifyBookingConfirmed(booking, deps);
  return booking;
}

async function createConfirmedPaidBookingIdempotently(bookingInput, user, orderId, deps = {}) {
  try {
    return await createConfirmedPaidBooking(bookingInput, user, deps);
  } catch (error) {
    if (error?.code !== 11000 || !orderId || typeof deps.BookingModel?.findOne !== 'function') {
      throw error;
    }

    const existing = await deps.BookingModel.findOne({ razorpayOrderId: orderId });
    if (!existing) {
      throw error;
    }

    return serializeBooking(existing);
  }
}

function validatePaymentAmount(totalAmount, razorpayOrder) {
  const expectedAmount = Math.round(Number(totalAmount) * 100);

  if (!razorpayOrder || Number(razorpayOrder.amount) !== expectedAmount) {
    throw createHttpError(400, 'Payment amount mismatch');
  }
}

function normalizeBookingInput(input) {
  return {
    parking: input.parking,
    vehicleType: input.vehicleType,
    bookingDate: input.bookingDate,
    startTime: input.startTime,
    endTime: input.endTime,
    slotCount: Number(input.slotCount)
  };
}

async function validatePaymentBookingRequest(BookingModel, ParkingModel, bookingInput, user) {
  if (user?.status === 'suspended') {
    throw createHttpError(403, 'Your account has been suspended. You cannot create new bookings.');
  }

  const inputValidation = validatePaymentBookingInput(bookingInput);
  if (!inputValidation.valid) {
    throw createHttpError(400, formatValidationErrors(inputValidation.errors));
  }

  const parking = await ParkingModel.findOne({
    _id: bookingInput.parking,
    verificationStatus: 'approved',
    isActive: true
  });

  if (!parking) {
    throw createHttpError(404, 'Parking listing not found');
  }

  if (!parking.vehicleTypes.includes(bookingInput.vehicleType)) {
    throw createHttpError(409, 'Vehicle type is not supported by this parking listing');
  }

  const occupiedSlots = await countPaidOverlappingSlots(BookingModel, bookingInput);
  const slotValidation = validateSlotAvailability(
    bookingInput.slotCount,
    parking.totalSlots,
    occupiedSlots
  );

  if (!slotValidation.valid) {
    throw createHttpError(409, slotValidation.error);
  }

  return parking;
}

async function countPaidOverlappingSlots(BookingModel, bookingInput) {
  const aggregate = BookingModel.aggregate([
    { $match: buildBookingOverlapFilter(bookingInput) },
    { $group: { _id: null, slotCount: { $sum: '$slotCount' } } }
  ]);
  const result = await aggregate;
  return result[0]?.slotCount ?? 0;
}

function buildOrderNotes(bookingInput, user, totalAmount) {
  return {
    userId: user._id.toString(),
    parking: bookingInput.parking.toString(),
    vehicleType: bookingInput.vehicleType,
    bookingDate: bookingInput.bookingDate,
    startTime: bookingInput.startTime,
    endTime: bookingInput.endTime,
    slotCount: String(bookingInput.slotCount),
    totalAmount: String(totalAmount)
  };
}

function extractBookingInputFromOrder(order, fallbackInput = {}) {
  return {
    parking: getOrderNote(order, 'parking') ?? fallbackInput.parking,
    vehicleType: getOrderNote(order, 'vehicleType') ?? fallbackInput.vehicleType,
    bookingDate: getOrderNote(order, 'bookingDate') ?? fallbackInput.bookingDate,
    startTime: getOrderNote(order, 'startTime') ?? fallbackInput.startTime,
    endTime: getOrderNote(order, 'endTime') ?? fallbackInput.endTime,
    slotCount: Number(getOrderNote(order, 'slotCount') ?? fallbackInput.slotCount)
  };
}

function getOrderNote(order, key) {
  return order?.notes?.[key] ?? order?.notes?.notes?.[key];
}

function logPaymentVerification(input) {
  if (env.NODE_ENV === 'development') {
    console.log('Payment verification:', {
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
