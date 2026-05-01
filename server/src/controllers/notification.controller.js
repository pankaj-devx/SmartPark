import {
  getUserNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead
} from '../services/notification.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/notifications
 * Returns all notifications for the authenticated user plus the unread count.
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const [notifications, unreadCount] = await Promise.all([
    getUserNotifications(req.user._id),
    getUnreadCount(req.user._id)
  ]);

  res.status(200).json({
    success: true,
    data: { notifications, unreadCount }
  });
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read.
 */
export const readNotification = asyncHandler(async (req, res) => {
  const notification = await markAsRead(req.params.id, req.user._id);

  res.status(200).json({
    success: true,
    data: { notification }
  });
});

/**
 * PATCH /api/notifications/read-all
 * Mark every unread notification for the user as read.
 */
export const readAllNotifications = asyncHandler(async (req, res) => {
  await markAllAsRead(req.user._id);

  res.status(200).json({
    success: true,
    data: { message: 'All notifications marked as read' }
  });
});
