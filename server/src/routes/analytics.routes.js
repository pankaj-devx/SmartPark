import { Router } from 'express';
import { getAdminAnalytics, getDriverAnalytics, getOwnerAnalytics } from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { requireDatabase } from '../middleware/requireDatabase.js';

export const analyticsRoutes = Router();

analyticsRoutes.use(requireDatabase, authenticate);

analyticsRoutes.get('/driver', authorizeRoles('driver'), getDriverAnalytics);
analyticsRoutes.get('/owner', authorizeRoles('owner'), getOwnerAnalytics);
analyticsRoutes.get('/admin', authorizeRoles('admin'), getAdminAnalytics);
