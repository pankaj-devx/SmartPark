import { Router } from 'express';
import {
  approveParking,
  blockUser,
  cancelBooking,
  deleteParking,
  getBookings,
  getDashboard,
  getParkings,
  getUsers,
  rejectParking,
  toggleParkingActive,
  unblockUser,
  verifyBooking
} from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { requireDatabase } from '../middleware/requireDatabase.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  adminBookingIdParamSchema,
  adminBookingQuerySchema,
  adminParkingIdParamSchema,
  adminRejectParkingSchema,
  adminUserIdParamSchema
} from '../validators/admin.validator.js';
import { verifyBookingSchema } from '../validators/owner.validator.js';

export const adminRoutes = Router();

adminRoutes.use(requireDatabase, authenticate, authorizeRoles('admin'));

adminRoutes.get('/dashboard', getDashboard);

// Users
adminRoutes.get('/users', getUsers);
adminRoutes.patch('/users/:id/block', validateRequest(adminUserIdParamSchema, 'params'), blockUser);
adminRoutes.patch('/users/:id/unblock', validateRequest(adminUserIdParamSchema, 'params'), unblockUser);

// Parkings
adminRoutes.get('/parkings', getParkings);
adminRoutes.patch('/parkings/:id/approve', validateRequest(adminParkingIdParamSchema, 'params'), approveParking);
adminRoutes.patch('/parkings/:id/reject', validateRequest(adminParkingIdParamSchema, 'params'), validateRequest(adminRejectParkingSchema), rejectParking);
adminRoutes.patch('/parkings/:id/toggle-active', validateRequest(adminParkingIdParamSchema, 'params'), toggleParkingActive);
adminRoutes.delete('/parkings/:id', validateRequest(adminParkingIdParamSchema, 'params'), deleteParking);

// Bookings
adminRoutes.get('/bookings', validateRequest(adminBookingQuerySchema, 'query'), getBookings);
adminRoutes.patch('/bookings/:id/cancel', validateRequest(adminBookingIdParamSchema, 'params'), cancelBooking);
adminRoutes.post('/bookings/verify', validateRequest(verifyBookingSchema), verifyBooking);
