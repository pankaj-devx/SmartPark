import { Router } from 'express';
import {
  getNotifications,
  readAllNotifications,
  readNotification
} from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireDatabase } from '../middleware/requireDatabase.js';

export const notificationRoutes = Router();

// All notification routes require authentication
notificationRoutes.use(requireDatabase, authenticate);

notificationRoutes.get('/', getNotifications);

// read-all must be declared before /:id to avoid param capture
notificationRoutes.patch('/read-all', readAllNotifications);
notificationRoutes.patch('/:id/read', readNotification);
