/**
 * NotificationBell.jsx
 * --------------------
 * Bell icon with unread badge + dropdown list.
 * Shown in the AppLayout header for authenticated users.
 *
 * Props: none — reads auth from context, fetches its own data.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from './notificationService.js';

// How often to poll for new notifications (ms). Keeps the bell live without
// websockets. Pauses automatically when the dropdown is open.
const POLL_INTERVAL_MS = 30_000;

// Human-readable type labels
const TYPE_LABELS = {
  booking_confirmed: 'Booking confirmed',
  new_booking:       'New booking',
  booking_cancelled: 'Booking cancelled'
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [isOpen, setIsOpen]               = useState(false);
  const dropdownRef = useRef(null);
  const pollRef     = useRef(null);

  // ── Data fetching ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const data = await fetchNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Silent — bell stays at last known state
    }
  }, []);

  // Initial load
  useEffect(() => {
    load();
  }, [load]);

  // Polling — paused while dropdown is open to avoid flicker
  useEffect(() => {
    if (isOpen) return;
    pollRef.current = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [isOpen, load]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleOutsideClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // ── Actions ────────────────────────────────────────────────────────────
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

  function toggleOpen() {
    setIsOpen((v) => !v);
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} unread` : ''}`}
        className="relative inline-flex items-center justify-center rounded-xl border p-2 transition hover:bg-slate-100"
        onClick={toggleOpen}
        style={{ borderColor: 'var(--app-border)', color: 'var(--app-text-muted)' }}
        type="button"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {/* Dropdown */}
      {isOpen ? (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border shadow-lg"
          style={{ borderColor: 'var(--app-border)', background: 'var(--app-surface)' }}
          role="dialog"
          aria-label="Notifications"
        >
          {/* Header */}
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: 'var(--app-border)' }}
          >
            <p className="app-heading text-sm font-semibold">Notifications</p>
            <div className="flex items-center gap-2">
              {unreadCount > 0 ? (
                <button
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold hover:bg-slate-100"
                  onClick={handleMarkAllRead}
                  style={{ color: 'var(--app-text-muted)' }}
                  title="Mark all as read"
                  type="button"
                >
                  <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  All read
                </button>
              ) : null}
              <Link
                className="text-xs font-semibold text-brand-600 hover:underline"
                onClick={() => setIsOpen(false)}
                to="/notifications"
              >
                See all
                <ExternalLink className="ml-0.5 inline h-3 w-3" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* List */}
          <ul
            className="max-h-80 overflow-y-auto divide-y"
            style={{ divideColor: 'var(--app-border)' }}
          >
            {notifications.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm" style={{ color: 'var(--app-text-muted)' }}>
                No notifications yet
              </li>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onMarkRead={handleMarkRead}
                />
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

// ── NotificationItem ─────────────────────────────────────────────────────────

function NotificationItem({ notification: n, onMarkRead }) {
  const timeAgo = formatTimeAgo(n.createdAt);

  return (
    <li
      className={`flex items-start gap-3 px-4 py-3 transition ${
        n.isRead ? '' : 'bg-blue-50'
      }`}
      style={n.isRead ? { background: 'var(--app-surface)' } : undefined}
    >
      {/* Unread dot */}
      <span
        aria-hidden="true"
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
          n.isRead ? 'bg-transparent' : 'bg-blue-500'
        }`}
      />

      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold" style={{ color: 'var(--app-text-muted)' }}>
          {TYPE_LABELS[n.type] ?? n.type}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--app-text)' }}>
          {n.message}
        </p>
        <p className="mt-1 text-xs" style={{ color: 'var(--app-text-muted)' }}>
          {timeAgo}
        </p>
      </div>

      {!n.isRead ? (
        <button
          aria-label="Mark as read"
          className="shrink-0 rounded p-1 text-xs hover:bg-slate-200"
          onClick={() => onMarkRead(n.id)}
          style={{ color: 'var(--app-text-muted)' }}
          title="Mark as read"
          type="button"
        >
          <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </li>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeAgo(dateString) {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1)  return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)   return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
