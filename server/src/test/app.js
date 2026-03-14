/**
 * Test-friendly Express app factory.
 *
 * Mirrors the server.js middleware chain but intentionally omits:
 *   - connectDB          → tests manage their own connection via setup.js
 *   - Socket.io          → not needed for HTTP integration tests
 *   - Cron jobs          → no side-effect timers in test process
 *   - httpServer.listen  → supertest binds its own ephemeral port
 *   - passport.initialize() → passport strategies still load (LocalStrategy
 *                              is imported via auth routes); we skip the
 *                              session middleware since tests use JWT
 *   - helmet             → security headers add noise, not test value
 *   - cors               → tests call the app directly, no cross-origin
 *   - morgan             → no HTTP logs during test runs
 *   - apiLimiter         → would throttle repeated test runs
 *   - writeLimiter       → same as above
 *   - CSRF origin check  → tests do not send an Origin header
 *
 * NOTE: authLimiter is applied per-route inside routes/auth.js and cannot
 * be stripped here without modifying route files. It falls back to an
 * in-memory store when Redis is unavailable, so typical test traffic
 * will not hit the limit.
 *
 * Usage:
 *   import { createTestApp } from './app.js';
 *   const app = createTestApp();
 *   const res = await request(app).get('/api/health');
 */

import express from 'express';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import { AppError } from '../utils/errors.js';

// ── Routes (same mount order as server.js) ────────────────────────────────────
import authRoutes from '../routes/auth.js';
import userRoutes from '../routes/users.js';
import pinRoutes from '../routes/pins.js';
import reviewRoutes from '../routes/reviews.js';
import postRoutes from '../routes/posts.js';
import eventRoutes from '../routes/events.js';
import messageRoutes from '../routes/messages.js';
import geocodeRoutes from '../routes/geocode.js';
import notificationRoutes from '../routes/notifications.js';
import reportRoutes from '../routes/reports.js';
import discoverRoutes from '../routes/discover.js';
import activityRoutes from '../routes/activity.js';
import collectionRoutes from '../routes/collections.js';

export function createTestApp() {
  const app = express();

  // ── Request ID ──────────────────────────────────────────────────────────────
  app.use((req, res, next) => {
    req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-ID', req.requestId);
    next();
  });

  // ── Security / body parsing (mirrors server.js order) ──────────────────────
  app.use(mongoSanitize()); // NoSQL injection protection
  app.use(xss());           // XSS sanitisation
  app.use(hpp());           // HTTP parameter pollution prevention
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // ── Health check ────────────────────────────────────────────────────────────
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // ── API Routes ──────────────────────────────────────────────────────────────
  // Specific sub-paths before generic ones to avoid /:id swallowing them.
  app.use('/api/auth', authRoutes);
  app.use('/api/users/me/activity', activityRoutes);       // before /api/users
  app.use('/api/users/notifications', notificationRoutes); // before /api/users
  app.use('/api/users', userRoutes);
  app.use('/api/pins', pinRoutes);
  app.use('/api', reviewRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/discover', discoverRoutes);
  app.use('/api/geocode', geocodeRoutes);
  app.use('/api/collections', collectionRoutes);

  // ── 404 handler ─────────────────────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route not found: ${req.method} ${req.originalUrl}`,
      },
    });
  });

  // ── Global error handler (mirrors server.js exactly) ────────────────────────
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    const rid = req.requestId ? `[${req.requestId}]` : '';
    console.error(`${rid} ${err.stack || err.message}`);

    if (err instanceof AppError) {
      return res.status(err.status).json({
        success: false,
        error: err.toJSON(),
        ...(req.requestId && { requestId: req.requestId }),
      });
    }

    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: err.message },
        ...(req.requestId && { requestId: req.requestId }),
      });
    }

    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_ENTRY', message: 'Duplicate entry' },
        ...(req.requestId && { requestId: req.requestId }),
      });
    }

    res.status(err.status || 500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'Internal server error',
      },
      ...(req.requestId && { requestId: req.requestId }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  });

  return app;
}
