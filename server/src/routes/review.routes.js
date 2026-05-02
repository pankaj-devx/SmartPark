import { Router } from 'express';
import {
  deleteReviewHandler,
  getAllReviewsHandler,
  getMyReviews,
  getOwnerReviewsHandler,
  getParkingReviewsHandler,
  getReviewedBookings,
  submitReview
} from '../controllers/review.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { requireDatabase } from '../middleware/requireDatabase.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  createReviewSchema,
  parkingIdParamSchema,
  reviewIdParamSchema
} from '../validators/review.validator.js';

export const reviewRoutes = Router();

// ---------------------------------------------------------------------------
// IMPORTANT — route ordering
// ---------------------------------------------------------------------------
// Express matches routes in registration order. All named paths (/my-reviews,
// /owner, /reviewed-bookings, /) MUST be registered BEFORE the parameterised
// path /parking/:parkingId. If the param route comes first, Express treats the
// literal strings "my-reviews" and "owner" as the :parkingId value, causing
// those endpoints to silently return 400/404 instead of their real responses.
//
// The public /parking/:parkingId route does NOT use the router-level
// authenticate middleware — it is intentionally unauthenticated so anyone
// can read reviews on a parking listing page.
// ---------------------------------------------------------------------------

// ── Driver ───────────────────────────────────────────────────────────────────

// Submit a review for a completed booking
reviewRoutes.post(
  '/',
  requireDatabase,
  authenticate,
  authorizeRoles('driver'),
  validateRequest(createReviewSchema),
  submitReview
);

// List the current driver's own reviews
reviewRoutes.get(
  '/my-reviews',
  requireDatabase,
  authenticate,
  authorizeRoles('driver'),
  getMyReviews
);

// Return which booking IDs from a supplied list already have a review
reviewRoutes.post(
  '/reviewed-bookings',
  requireDatabase,
  authenticate,
  authorizeRoles('driver'),
  getReviewedBookings
);

// ── Owner ────────────────────────────────────────────────────────────────────

// All reviews across the owner's parkings
reviewRoutes.get(
  '/owner',
  requireDatabase,
  authenticate,
  authorizeRoles('owner', 'admin'),
  getOwnerReviewsHandler
);

// ── Admin ────────────────────────────────────────────────────────────────────

// All reviews on the platform
reviewRoutes.get(
  '/',
  requireDatabase,
  authenticate,
  authorizeRoles('admin'),
  getAllReviewsHandler
);

// Delete a review
reviewRoutes.delete(
  '/:id',
  requireDatabase,
  authenticate,
  authorizeRoles('admin'),
  validateRequest(reviewIdParamSchema, 'params'),
  deleteReviewHandler
);

// ── Public (param route — registered last) ───────────────────────────────────
// /parking/:parkingId must come after all named routes above. If it were
// registered first, ":parkingId" would greedily match "my-reviews", "owner",
// etc., and those endpoints would never be reached.
reviewRoutes.get(
  '/parking/:parkingId',
  requireDatabase,
  validateRequest(parkingIdParamSchema, 'params'),
  getParkingReviewsHandler
);
