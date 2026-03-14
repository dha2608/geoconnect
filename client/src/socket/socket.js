/**
 * socket.js — Socket.io singleton connection manager
 *
 * Usage:
 *   import { connectSocket, disconnectSocket, getSocket } from './socket';
 *
 *   const socket = connectSocket(token);   // idempotent — returns existing if connected
 *   const socket = getSocket();            // returns current socket or null
 *   disconnectSocket();                    // tears down connection and resets singleton
 */

import { io } from 'socket.io-client';

const DEBUG = import.meta.env.DEV;
const log = (...args) => DEBUG && console.log(...args);
const logError = (...args) => DEBUG && console.error(...args);

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/** @type {import('socket.io-client').Socket | null} */
let socket = null;

/**
 * Connect (or return existing) socket with JWT auth.
 * Idempotent: if a live connection already exists, returns it unchanged.
 *
 * @param {string} token  JWT access token
 * @returns {import('socket.io-client').Socket}
 */
export const connectSocket = (token) => {
  // Return existing live or connecting socket — prevents triple-connect on
  // StrictMode double-invocations and HMR remounts
  if (socket?.connected || socket?.active) return socket;

  // If a stale / fully disconnected socket exists, remove it before reconnecting
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    // Prefer WebSocket, fall back to long-polling
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 3000,
    reconnectionDelayMax: 10000,
    // Send credentials (cookies) when the API and client share an origin
    withCredentials: true,
  });

  /* ── Connection lifecycle logging ── */
  socket.on('connect', () =>
    log(`[Socket] Connected  id=${socket.id}`)
  );

  socket.on('disconnect', (reason) =>
    log(`[Socket] Disconnected  reason=${reason}`)
  );

  socket.on('connect_error', (err) =>
    logError(`[Socket] Connection error: ${err.message}`)
  );

  socket.on('reconnect', (attempt) =>
    log(`[Socket] Reconnected after ${attempt} attempt(s)`)
  );

  socket.on('reconnect_failed', () =>
    logError('[Socket] Reconnection failed — giving up')
  );

  return socket;
};

/**
 * Disconnect and clear the singleton.
 * Safe to call even when already disconnected.
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};

/**
 * Return the current socket instance, or null if not connected.
 *
 * @returns {import('socket.io-client').Socket | null}
 */
export const getSocket = () => socket;

export default { connectSocket, disconnectSocket, getSocket };
