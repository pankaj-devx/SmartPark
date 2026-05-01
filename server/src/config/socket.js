/**
 * socket.js
 * ---------
 * Singleton Socket.IO manager.
 *
 * Pattern: initialise once in server.js with an HTTP server, then import
 * `getIO()` anywhere in the app to emit events without circular deps.
 *
 * User registration:
 *   Client emits  → socket.emit("register", userId)
 *   Server stores → userSocketMap.set(userId, socketId)
 *
 * Emitting to a user:
 *   emitToUser(userId, event, payload)
 */

import { Server } from 'socket.io';
import { env } from './env.js';

let io = null;

// userId (string) → Set<socketId> — one user can have multiple tabs open
const userSocketMap = new Map();

/**
 * Initialise Socket.IO on the given HTTP server.
 * Called once from server.js after the HTTP server is created.
 *
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URLS,
      credentials: true
    },
    // Prefer WebSocket, fall back to polling
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    // Client registers its userId after connecting
    socket.on('register', (userId) => {
      if (!userId) return;
      const uid = String(userId);

      if (!userSocketMap.has(uid)) {
        userSocketMap.set(uid, new Set());
      }
      userSocketMap.get(uid).add(socket.id);
    });

    socket.on('disconnect', () => {
      // Remove this socket from every user entry it was registered under
      for (const [uid, sockets] of userSocketMap.entries()) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSocketMap.delete(uid);
        }
      }
    });
  });

  return io;
}

/**
 * Return the initialised Socket.IO instance.
 * Safe to call before initSocket — returns null, callers must guard.
 *
 * @returns {import('socket.io').Server | null}
 */
export function getIO() {
  return io;
}

/**
 * Emit an event to all sockets registered for a given userId.
 * No-ops silently if the user is offline or socket is not initialised.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {string} event
 * @param {unknown} payload
 */
export function emitToUser(userId, event, payload) {
  if (!io) return;

  const uid = String(userId);
  const sockets = userSocketMap.get(uid);
  if (!sockets?.size) return;

  for (const socketId of sockets) {
    io.to(socketId).emit(event, payload);
  }
}
