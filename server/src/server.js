import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';

import connectDB from './config/db.js';
import passport from './config/passport.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { setupSocket } from './socket/handler.js';

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

// Make io accessible in routes
app.set('io', io);

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users/notifications', notificationRoutes); // must be before /api/users — prevents /:id swallowing "notifications"
app.use('/api/users', userRoutes);
app.use('/api/pins', pinRoutes);
app.use('/api', reviewRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/geocode', geocodeRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`[GeoConnect] Server running on port ${PORT}`);
});

export default app;
