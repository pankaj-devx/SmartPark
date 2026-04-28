import { Router } from 'express';
import {
  approveParking,
  getBookings,
  getDashboard,
  getParkings,
  rejectParking,
  toggleParkingActive
} from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { requireDatabase } from '../middleware/requireDatabase.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { adminBookingQuerySchema, adminRejectParkingSchema } from '../validators/admin.validator.js';

export const adminRoutes = Router();

adminRoutes.use(requireDatabase, authenticate, authorizeRoles('admin'));

adminRoutes.get('/dashboard', getDashboard);
adminRoutes.get('/parkings', getParkings);
adminRoutes.patch('/parkings/:id/approve', approveParking);
adminRoutes.patch('/parkings/:id/reject', validateRequest(adminRejectParkingSchema), rejectParking);
adminRoutes.patch('/parkings/:id/toggle-active', toggleParkingActive);
adminRoutes.get('/bookings', validateRequest(adminBookingQuerySchema, 'query'), getBookings);
