/**
 * notificationService.js
 * ----------------------
 * Client-side service for the Phase 8A notification API.
 * All functions return safe defaults on failure so callers never crash.
 */

import { apiClient } from '../../lib/apiClient.js';

/**
 * Fetch all notifications + unread count for the authenticated user.
 * @returns {{ notifications: Notification[], unreadCount: number }}
 */
export async function fetchNotifications() {
  const response = await apiClient.get('/notifications');
  const { notifications = [], unreadCount = 0 } = response.data?.data ?? {};
  return { notifications, unreadCount };
}

/**
 * Mark a single notification as read.
 * @param {string} id
 */
export async function markNotificationRead(id) {
  const response = await apiClient.patch(`/notifications/${id}/read`);
  return response.data?.data?.notification ?? null;
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsRead() {
  await apiClient.patch('/notifications/read-all');
}
