import { Router } from 'express';
import {
  approveParkingListing,
  createParkingListing,
  deleteParkingListingImage,
  deleteParkingListing,
  getMyParkingListings,
  getNearbyParkingListings,
  getParkingListing,
  getPublicParkingListings,
  rejectParkingListing,
  setPrimaryParkingListingImage,
  updateParkingListing,
  uploadParkingListingImages
} from '../controllers/parking.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { optionalAuthenticate } from '../middleware/optionalAuthenticate.js';
import { requireDatabase } from '../middleware/requireDatabase.js';
import { uploadParkingImages } from '../middleware/uploadParkingImages.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  createParkingSchema,
  listParkingQuerySchema,
  nearbyParkingQuerySchema,
  rejectParkingSchema,
  setPrimaryImageSchema,
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
parkingRoutes.post(
  '/:id/images',
  requireDatabase,
  authenticate,
  authorizeRoles('owner', 'admin'),
  uploadParkingImages,
  uploadParkingListingImages
);
parkingRoutes.delete(
  '/:id/images/:imageId',
  requireDatabase,
  authenticate,
  authorizeRoles('owner', 'admin'),
  deleteParkingListingImage
);
parkingRoutes.patch(
  '/:id/images/primary',
  requireDatabase,
  authenticate,
  authorizeRoles('owner', 'admin'),
  validateRequest(setPrimaryImageSchema),
  setPrimaryParkingListingImage
);
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
