import { Router } from 'express';
import {
  cancelBookingReservation,
  createBookingReservation,
  getBooking,
  getMyBookings
} from '../controllers/booking.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { requireDatabase } from '../middleware/requireDatabase.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createBookingSchema } from '../validators/booking.validator.js';

export const bookingRoutes = Router();

bookingRoutes.post('/', requireDatabase, authenticate, authorizeRoles('driver'), validateRequest(createBookingSchema), createBookingReservation);
bookingRoutes.get('/my-bookings', requireDatabase, authenticate, authorizeRoles('driver'), getMyBookings);
bookingRoutes.get('/:id', requireDatabase, authenticate, authorizeRoles('driver'), getBooking);
bookingRoutes.patch('/:id/cancel', requireDatabase, authenticate, authorizeRoles('driver'), cancelBookingReservation);
