import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import crypto from 'crypto';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';

import connectDB from './config/db.js';
import mongoose from 'mongoose';
import passport from './config/passport.js';
import { apiLimiter, writeLimiter } from './middleware/rateLimiter.js';
import { AppError } from './utils/errors.js';
import { setupSocket } from './socket/handler.js';
import { startEventReminderJob } from './jobs/eventReminder.js';

// Routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import pinRoutes from './routes/pins.js';
import reviewRoutes from './routes/reviews.js';
import postRoutes from './routes/posts.js';
import eventRoutes from './routes/events.js';
import messageRoutes from './routes/messages.js';
import geocodeRoutes from './routes/geocode.js';
import notificationRoutes from './routes/notifications.js';
import reportRoutes from './routes/reports.js';
import discoverRoutes from './routes/discover.js';
import activityRoutes from './routes/activity.js';
import collectionRoutes from './routes/collections.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// Connect to MongoDB
connectDB();

// Setup Socket.io
setupSocket(io);

// Start cron jobs
startEventReminderJob(io);

// Make io accessible in routes
app.set('io', io);

// ── Request ID middleware ─────────────────────────────────────────────────────
// Attaches a unique X-Request-ID to every request/response for tracing.
app.use((req, res, next) => {
  const id = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
});

// Middleware
app.use(helmet());
app.use(mongoSanitize());  // Sanitize data against NoSQL injection
app.use(xss());            // Prevent XSS attacks
app.use(hpp());            // Prevent HTTP parameter pollution
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());
app.use(apiLimiter);

// CSRF protection: verify origin for state-changing requests
// Note: requests without Origin header (server-to-server, mobile apps, same-origin forms)
// are allowed through — the Bearer token itself provides CSRF protection for API calls.
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
  if (!origin) return next();
  if (origin !== allowedOrigin) {
    return res.status(403).json({ message: 'Forbidden: invalid origin' });
  }
  next();
});

// Write limiter — applies only to mutating HTTP methods on /api/
app.use('/api/', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users/me/activity', activityRoutes);       // must be before /api/users — prevents generic user router swallowing the path
app.use('/api/users/notifications', notificationRoutes); // must be before /api/users — prevents /:id swallowing "notifications"
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

// 404 handler — catch all unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  });
});

// Global error handler — works with AppError and asyncHandler
app.use((err, req, res, _next) => {
  // Log with request ID for tracing
  const rid = req.requestId ? `[${req.requestId}]` : '';
  console.error(`${rid} ${err.stack || err.message}`);

  // If it's our AppError, use its structured data
  if (err instanceof AppError) {
    return res.status(err.status).json({
      success: false,
      error: err.toJSON(),
      ...(req.requestId && { requestId: req.requestId }),
    });
  }

  // Mongoose validation error → 400
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: err.message },
      ...(req.requestId && { requestId: req.requestId }),
    });
  }

  // Mongoose duplicate key → 409
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: { code: 'DUPLICATE_ENTRY', message: 'Duplicate entry' },
      ...(req.requestId && { requestId: req.requestId }),
    });
  }

  // Fallback — generic 500
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

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`[GeoConnect] Server running on port ${PORT}`);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n[GeoConnect] ${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  httpServer.close(async () => {
    console.log('[GeoConnect] HTTP server closed');

    // Close Socket.io connections
    await new Promise((resolve) => io.close(resolve));
    console.log('[GeoConnect] Socket.io connections closed');

    // Close MongoDB connection
    try {
      await mongoose.connection.close();
      console.log('[GeoConnect] MongoDB connection closed');
    } catch (err) {
      console.error('[GeoConnect] Error closing MongoDB:', err.message);
    }

    process.exit(0);
  });

  // Force exit after 10s if graceful shutdown hangs
  setTimeout(() => {
    console.error('[GeoConnect] Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
