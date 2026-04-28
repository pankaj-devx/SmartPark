import { Router } from 'express';
import {
  completeOwnerBookingReservation,
  getOwnerBookingDashboard
} from '../controllers/owner.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { requireDatabase } from '../middleware/requireDatabase.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { ownerBookingQuerySchema } from '../validators/owner.validator.js';

export const ownerRoutes = Router();

ownerRoutes.use(requireDatabase, authenticate, authorizeRoles('owner', 'admin'));

ownerRoutes.get('/bookings', validateRequest(ownerBookingQuerySchema, 'query'), getOwnerBookingDashboard);
ownerRoutes.patch('/bookings/:id/complete', completeOwnerBookingReservation);
