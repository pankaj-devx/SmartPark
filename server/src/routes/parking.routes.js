import { Router } from 'express';
import {
  approveParkingListing,
  createParkingListing,
  deleteParkingListing,
  getMyParkingListings,
  getNearbyParkingListings,
  getParkingListing,
  getPublicParkingListings,
  rejectParkingListing,
  updateParkingListing
} from '../controllers/parking.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { optionalAuthenticate } from '../middleware/optionalAuthenticate.js';
import { requireDatabase } from '../middleware/requireDatabase.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  createParkingSchema,
  listParkingQuerySchema,
  nearbyParkingQuerySchema,
  rejectParkingSchema,
  updateParkingSchema
} from '../validators/parking.validator.js';

export const parkingRoutes = Router();

parkingRoutes.get('/', requireDatabase, validateRequest(listParkingQuerySchema, 'query'), getPublicParkingListings);
parkingRoutes.get(
  '/nearby',
  requireDatabase,
  validateRequest(nearbyParkingQuerySchema, 'query'),
  getNearbyParkingListings
);
parkingRoutes.post(
  '/',
  requireDatabase,
  authenticate,
  authorizeRoles('owner', 'admin'),
  validateRequest(createParkingSchema),
  createParkingListing
);
parkingRoutes.get('/mine', requireDatabase, authenticate, authorizeRoles('owner', 'admin'), getMyParkingListings);
parkingRoutes.patch(
  '/:id/approve',
  requireDatabase,
  authenticate,
  authorizeRoles('admin'),
  approveParkingListing
);
parkingRoutes.patch(
  '/:id/reject',
  requireDatabase,
  authenticate,
  authorizeRoles('admin'),
  validateRequest(rejectParkingSchema),
  rejectParkingListing
);
parkingRoutes.get('/:id', requireDatabase, optionalAuthenticate, getParkingListing);
parkingRoutes.patch(
  '/:id',
  requireDatabase,
  authenticate,
  authorizeRoles('owner', 'admin'),
  validateRequest(updateParkingSchema),
  updateParkingListing
);
parkingRoutes.delete(
  '/:id',
  requireDatabase,
  authenticate,
  authorizeRoles('owner', 'admin'),
  deleteParkingListing
);
