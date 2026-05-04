import { Router } from 'express';
import {
  createPaymentOrderHandler,
  paymentWebhookHandler,
  verifyPaymentHandler
} from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { requireDatabase } from '../middleware/requireDatabase.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  createPaymentOrderSchema,
  verifyPaymentSchema
} from '../validators/payment.validator.js';

export const paymentRoutes = Router();

paymentRoutes.post(
  '/create-order',
  requireDatabase,
  authenticate,
  authorizeRoles('driver'),
  validateRequest(createPaymentOrderSchema),
  createPaymentOrderHandler
);

paymentRoutes.post(
  '/verify',
  requireDatabase,
  authenticate,
  authorizeRoles('driver'),
  validateRequest(verifyPaymentSchema),
  verifyPaymentHandler
);

paymentRoutes.post('/webhook', requireDatabase, paymentWebhookHandler);
