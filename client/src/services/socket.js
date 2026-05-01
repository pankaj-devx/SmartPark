/**
 * socket.js
 * ---------
 * Singleton Socket.IO client for SmartPark.
 *
 * Usage:
 *   connect(userId)   — call after login / on auth bootstrap
 *   disconnect()      — call on logout
 *   getSocket()       — returns the socket instance (or null)
 *   onNotification(cb) — subscribe to new_notification events
 *   offNotification(cb) — unsubscribe
 */

import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL
  ? new URL(import.meta.env.VITE_API_BASE_URL).origin  // strip /api path
  : 'http://localhost:5000';

let socket = null;

/**
 * Connect to the server and register the authenticated user.
 * Safe to call multiple times — reconnects only if not already connected.
 *
 * @param {string} userId
 */
export function connect(userId) {
  if (socket?.connected) {
    // Already connected — just re-register in case userId changed
    socket.emit('register', userId);
    return;
  }

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    autoConnect: true
  });

  socket.on('connect', () => {
    socket.emit('register', userId);
  });

  socket.on('connect_error', (err) => {
    // Non-fatal — polling fallback keeps the app working
    console.warn('[socket] connection error:', err.message);
  });
}

/**
 * Disconnect and destroy the socket.
 * Called on logout so the server cleans up the mapping.
 */
export function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Return the current socket instance, or null if not connected.
 * @returns {import('socket.io-client').Socket | null}
 */
export function getSocket() {
  return socket;
}

/**
 * Subscribe to incoming notifications.
 * @param {(notification: object) => void} callback
 */
export function onNotification(callback) {
  socket?.on('new_notification', callback);
}

/**
 * Unsubscribe from incoming notifications.
 * @param {(notification: object) => void} callback
 */
export function offNotification(callback) {
  socket?.off('new_notification', callback);
}
