/**
 * notification.service.js
 * -----------------------
 * Business logic for the Phase 8A notification system.
 * All functions are safe to call fire-and-forget from the booking flow —
 * they never throw in a way that would roll back a booking transaction.
 */

import { Notification } from '../models/notification.model.js';
import { createHttpError } from '../utils/createHttpError.js';
import { emitToUser } from '../config/socket.js';

const MAX_NOTIFICATIONS_PER_USER = 50; // cap to keep the collection lean

// ── Serializer ───────────────────────────────────────────────────────────────

export function serializeNotification(n) {
  return {
    id: n._id.toString(),
    userId: n.userId.toString(),
    role: n.role,
    type: n.type,
    message: n.message,
    isRead: n.isRead,
    createdAt: n.createdAt
  };
}

// ── Core operations ──────────────────────────────────────────────────────────

/**
 * Create a notification for a user.
 * Silently caps the collection at MAX_NOTIFICATIONS_PER_USER by removing
 * the oldest read notification when the limit is reached.
 *
 * @param {string|ObjectId} userId
 * @param {'driver'|'owner'} role
 * @param {'booking_confirmed'|'new_booking'|'booking_cancelled'} type
 * @param {string} message
 * @param {object} [deps] - injectable deps for testing
 */
export async function createNotification(userId, role, type, message, deps = {}) {
  const NotificationModel = deps.NotificationModel ?? Notification;

  const notification = await NotificationModel.create({ userId, role, type, message });

  const serialized = serializeNotification(notification);

  // Push to the user's socket(s) in real time — no-ops if they're offline
  emitToUser(userId, 'new_notification', serialized);

  // Prune oldest read notification if over cap (best-effort, non-blocking)
  const count = await NotificationModel.countDocuments({ userId });
  if (count > MAX_NOTIFICATIONS_PER_USER) {
    const oldest = await NotificationModel
      .findOne({ userId, isRead: true })
      .sort({ createdAt: 1 });
    if (oldest) await NotificationModel.deleteOne({ _id: oldest._id });
  }

  return serialized;
}

/**
 * Return all notifications for a user, newest first.
 * Includes both read and unread so the full history is visible.
 */
export async function getUserNotifications(userId, deps = {}) {
  const NotificationModel = deps.NotificationModel ?? Notification;

  const notifications = await NotificationModel
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(MAX_NOTIFICATIONS_PER_USER)
    .lean();

  return notifications.map(serializeNotification);
}

/**
 * Mark a single notification as read.
 * Throws 404 if not found, 403 if it belongs to a different user.
 */
export async function markAsRead(notificationId, userId, deps = {}) {
  const NotificationModel = deps.NotificationModel ?? Notification;

  const notification = await NotificationModel.findById(notificationId);

  if (!notification) {
    throw createHttpError(404, 'Notification not found');
  }

  if (notification.userId.toString() !== userId.toString()) {
    throw createHttpError(403, 'You do not have permission to update this notification');
  }

  notification.isRead = true;
  await notification.save();

  return serializeNotification(notification);
}

/**
 * Mark ALL unread notifications for a user as read in one operation.
 */
export async function markAllAsRead(userId, deps = {}) {
  const NotificationModel = deps.NotificationModel ?? Notification;

  await NotificationModel.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
}

/**
 * Return the count of unread notifications for a user.
 * Used by the bell badge — fast index-only query.
 */
export async function getUnreadCount(userId, deps = {}) {
  const NotificationModel = deps.NotificationModel ?? Notification;
  return NotificationModel.countDocuments({ userId, isRead: false });
}
