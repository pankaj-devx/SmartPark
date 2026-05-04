import {
  createPaymentOrder,
  handlePaymentWebhook,
  verifyPayment
} from '../services/payment.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createPaymentOrderHandler = asyncHandler(async (req, res) => {
  const result = await createPaymentOrder(req.body, req.user);

  res.status(200).json({
    success: result.success,
    data: result
  });
});

export const verifyPaymentHandler = asyncHandler(async (req, res) => {
  const result = await verifyPayment(req.body, req.user);

  res.status(200).json({
    success: result.success,
    data: result
  });
});

export const paymentWebhookHandler = asyncHandler(async (req, res) => {
  const payload = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
  const result = await handlePaymentWebhook(payload, req.get('x-razorpay-signature'));

  res.status(200).json({
    success: result.success,
    data: result
  });
});
