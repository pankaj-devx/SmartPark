/**
 * NotificationsPage.jsx
 * ---------------------
 * Full-page notification list with mark-as-read controls.
 * Route: /notifications (protected — driver/owner/admin)
 */

import { useEffect, useState } from 'react';
import { Bell, CheckCheck, RefreshCw } from 'lucide-react';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from './notificationService.js';

const TYPE_LABELS = {
  booking_confirmed: 'Booking confirmed',
  new_booking:       'New booking',
  booking_cancelled: 'Booking cancelled'
};

const TYPE_COLOURS = {
  booking_confirmed: 'bg-green-100 text-green-800',
  new_booking:       'bg-blue-100 text-blue-800',
  booking_cancelled: 'bg-red-100 text-red-800'
};

export function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [isLoading, setIsLoading]         = useState(true);
  const [error, setError]                 = useState('');

  async function load() {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      setError('Unable to load notifications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleMarkRead(id) {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // Non-fatal
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Non-fatal
    }
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase text-brand-700">Activity</p>
          <h1 className="app-heading mt-1 text-2xl font-bold">Notifications</h1>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 ? (
            <button
              className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-slate-100"
              onClick={handleMarkAllRead}
              style={{ borderColor: 'var(--app-border-strong)', color: 'var(--app-text-muted)' }}
              type="button"
            >
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              Mark all read
            </button>
          ) : null}
          <button
            aria-label="Refresh notifications"
            className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-slate-100"
            disabled={isLoading}
            onClick={load}
            style={{ borderColor: 'var(--app-border-strong)', color: 'var(--app-text-muted)' }}
            type="button"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Error */}
      {error ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="grid gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              className="animate-pulse rounded-xl border p-4"
              key={i}
              style={{ borderColor: 'var(--app-border)', background: 'var(--app-surface)' }}
            >
              <div className="h-3 w-1/4 rounded" style={{ background: 'var(--app-surface-subtle)' }} />
              <div className="mt-2 h-4 w-3/4 rounded" style={{ background: 'var(--app-surface-muted)' }} />
              <div className="mt-1.5 h-3 w-1/3 rounded" style={{ background: 'var(--app-surface-muted)' }} />
            </div>
          ))}
        </div>
      ) : null}

      {/* Empty state */}
      {!isLoading && !error && notifications.length === 0 ? (
        <div
          className="rounded-xl border border-dashed p-10 text-center"
          style={{ borderColor: 'var(--app-border-strong)', background: 'var(--app-surface-muted)' }}
        >
          <Bell className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
          <p className="app-heading mt-3 font-semibold">No notifications yet</p>
          <p className="app-copy mt-1 text-sm">
            You'll see booking confirmations and alerts here.
          </p>
        </div>
      ) : null}

      {/* Notification list */}
      {!isLoading && notifications.length > 0 ? (
        <ul className="grid gap-3">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border p-4 transition ${
                n.isRead ? '' : 'border-blue-200 bg-blue-50'
              }`}
              style={n.isRead ? { borderColor: 'var(--app-border)', background: 'var(--app-surface)' } : undefined}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {/* Type badge */}
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                      TYPE_COLOURS[n.type] ?? 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {TYPE_LABELS[n.type] ?? n.type}
                  </span>

                  {/* Message */}
                  <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--app-text)' }}>
                    {n.message}
                  </p>

                  {/* Timestamp */}
                  <p className="mt-1 text-xs" style={{ color: 'var(--app-text-muted)' }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* Mark read button */}
                {!n.isRead ? (
                  <button
                    aria-label="Mark as read"
                    className="shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-100"
                    onClick={() => handleMarkRead(n.id)}
                    style={{ borderColor: 'var(--app-border-strong)', color: 'var(--app-text-muted)' }}
                    type="button"
                  >
                    <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
