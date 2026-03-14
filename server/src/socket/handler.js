import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import { updateLocation, removeLocation, startLocationManager } from './locationManager.js';

const onlineUsers = new Map(); // userId -> socketId

// ─── Per-user socket event rate limiter ──────────────────────────────────────

const EVENT_LIMITS = {
  message_send:      { max: 10, windowMs: 1000 },   // 10 msgs/sec
  typing_start:      { max: 5,  windowMs: 1000 },   // 5/sec
  typing_stop:       { max: 5,  windowMs: 1000 },
  location_update:   { max: 5,  windowMs: 1000 },   // 5 location pings/sec
  join_conversation: { max: 10, windowMs: 10000 },  // 10 joins per 10s
  join_room:         { max: 5,  windowMs: 10000 },
  stop_sharing:      { max: 3,  windowMs: 10000 },
};

const socketRateMap = new Map(); // userId -> { eventName -> { count, resetAt } }

function isSocketRateLimited(userId, eventName) {
  const limits = EVENT_LIMITS[eventName];
  if (!limits) return false;

  const now = Date.now();
  if (!socketRateMap.has(userId)) socketRateMap.set(userId, {});
  const userBuckets = socketRateMap.get(userId);

  if (!userBuckets[eventName] || now >= userBuckets[eventName].resetAt) {
    userBuckets[eventName] = { count: 1, resetAt: now + limits.windowMs };
    return false;
  }

  userBuckets[eventName].count++;
  return userBuckets[eventName].count > limits.max;
}

export const setupSocket = (io) => {
  // Start in-memory location store background flush
  startLocationManager();
  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.userId);
      if (!user) return next(new Error('User not found'));

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.userId}`);
    onlineUsers.set(socket.userId, socket.id);

    // Join personal room — only allow joining own room
    socket.on('join_room', ({ userId }) => {
      if (isSocketRateLimited(socket.userId, 'join_room')) return;
      if (userId !== socket.userId) return;
      socket.join(`user:${userId}`);
    });

    // Join conversation room for messaging + typing events
    // Security: verify user is a participant before allowing room join
    socket.on('join_conversation', async ({ conversationId }) => {
      if (isSocketRateLimited(socket.userId, 'join_conversation')) return;
      if (!conversationId) return;
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;
        const isParticipant = conversation.participants.some(
          (p) => p.toString() === socket.userId
        );
        if (!isParticipant) {
          socket.emit('error', { message: 'Not authorized to join this conversation' });
          return;
        }
        socket.join(`conversation:${conversationId}`);
      } catch (error) {
        console.error('[Socket] join_conversation error:', error.message);
      }
    });

    // Location sharing
    socket.on('location_update', async ({ lat, lng, heading }) => {
      if (isSocketRateLimited(socket.userId, 'location_update')) return;
      try {
        // Validate coordinates
        if (typeof lat !== 'number' || typeof lng !== 'number' ||
            lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          return;
        }

        const user = await User.findById(socket.userId);
        if (!user || !user.isLiveSharing) return;

        // Respect privacy settings
        if (!user.settings?.privacy?.shareLocation) return;

        // Store in memory (batched DB flush via locationManager)
        updateLocation(socket.userId, { lat, lng, heading });

        // Broadcast to mutual followers only if location is public
        if (!user.isLocationPublic) return;

        const mutualFollowers = user.followers.filter(f =>
          user.following.some(fo => fo.toString() === f.toString())
        );

        for (const followerId of mutualFollowers) {
          const followerSocketId = onlineUsers.get(followerId.toString());
          if (followerSocketId) {
            io.to(followerSocketId).emit('friend_location', {
              userId: socket.userId,
              lat, lng, heading,
              timestamp: Date.now(),
            });
          }
        }
      } catch (error) {
        console.error('[Socket] Location update error:', error.message);
      }
    });

    // Stop sharing
    socket.on('stop_sharing', async () => {
      if (isSocketRateLimited(socket.userId, 'stop_sharing')) return;
      removeLocation(socket.userId);
      await User.findByIdAndUpdate(socket.userId, { isLiveSharing: false });
      const user = await User.findById(socket.userId);
      if (user) {
        for (const followerId of user.followers) {
          const followerSocketId = onlineUsers.get(followerId.toString());
          if (followerSocketId) {
            io.to(followerSocketId).emit('friend_offline', { userId: socket.userId });
          }
        }
      }
    });

    // Messaging
    socket.on('message_send', ({ conversationId, text, locationPin }) => {
      if (isSocketRateLimited(socket.userId, 'message_send')) return;
      socket.to(`conversation:${conversationId}`).emit('new_message', {
        conversationId,
        text,
        sender: socket.userId,
        locationPin,
        timestamp: Date.now(),
      });
    });

    socket.on('typing_start', ({ conversationId }) => {
      if (isSocketRateLimited(socket.userId, 'typing_start')) return;
      socket.to(`conversation:${conversationId}`).emit('typing', {
        userId: socket.userId,
        isTyping: true,
      });
    });

    socket.on('typing_stop', ({ conversationId }) => {
      if (isSocketRateLimited(socket.userId, 'typing_stop')) return;
      socket.to(`conversation:${conversationId}`).emit('typing', {
        userId: socket.userId,
        isTyping: false,
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.userId}`);
      onlineUsers.delete(socket.userId);
      removeLocation(socket.userId);
      socketRateMap.delete(socket.userId);
    });
  });
};

export const sendNotification = (io, recipientId, notification) => {
  const socketId = onlineUsers.get(recipientId.toString());
  if (socketId) {
    io.to(socketId).emit('notification', notification);
  }
};
