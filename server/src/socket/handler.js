import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import { updateLocation, removeLocation, getLocation, getNearbyLocations, startLocationManager } from './locationManager.js';

const onlineUsers = new Map(); // userId -> socketId

// ─── User cache for socket hot paths (location_update) ──────────────────────
// TTL-based cache to avoid DB hit on every location ping
const userCache = new Map(); // userId -> { data, expiresAt }
const USER_CACHE_TTL = 30_000; // 30 seconds

function getCachedUser(userId) {
  const entry = userCache.get(userId);
  if (entry && Date.now() < entry.expiresAt) return entry.data;
  userCache.delete(userId);
  return null;
}

function setCachedUser(userId, data) {
  userCache.set(userId, { data, expiresAt: Date.now() + USER_CACHE_TTL });
}

function invalidateUserCache(userId) {
  userCache.delete(userId);
}

// ─── Conversation membership cache ───────────────────────────────────────────
const conversationCache = new Map(); // conversationId -> { participants, expiresAt }
const CONV_CACHE_TTL = 60_000; // 60 seconds

async function isConversationParticipant(conversationId, userId) {
  const entry = conversationCache.get(conversationId);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.participants.some((p) => p.toString() === userId);
  }
  const conversation = await Conversation.findById(conversationId).select('participants').lean();
  if (!conversation) return false;
  conversationCache.set(conversationId, {
    participants: conversation.participants,
    expiresAt: Date.now() + CONV_CACHE_TTL,
  });
  return conversation.participants.some((p) => p.toString() === userId);
}

// ─── Per-user socket event rate limiter ──────────────────────────────────────

const EVENT_LIMITS = {
  message_send:      { max: 10, windowMs: 1000 },   // 10 msgs/sec
  message_edit:      { max: 5,  windowMs: 1000 },   // 5 edits/sec
  reaction_add:      { max: 10, windowMs: 1000 },   // 10 reactions/sec
  reaction_remove:   { max: 10, windowMs: 1000 },
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
      const user = await User.findById(decoded.userId)
        .select('_id name avatar isLiveSharing isLocationPublic settings followers following')
        .lean();
      if (!user) return next(new Error('User not found'));

      socket.userId = user._id.toString();
      socket.user = user;
      setCachedUser(socket.userId, user);
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
    // Security: verify user is a participant before allowing room join (cached)
    socket.on('join_conversation', async ({ conversationId }) => {
      if (isSocketRateLimited(socket.userId, 'join_conversation')) return;
      if (!conversationId) return;
      try {
        const allowed = await isConversationParticipant(conversationId, socket.userId);
        if (!allowed) {
          socket.emit('error', { message: 'Not authorized to join this conversation' });
          return;
        }
        socket.join(`conversation:${conversationId}`);
      } catch (error) {
        console.error('[Socket] join_conversation error:', error.message);
      }
    });

    // Location sharing (uses cache to avoid DB hit per ping)
    socket.on('location_update', async ({ lat, lng, heading }) => {
      if (isSocketRateLimited(socket.userId, 'location_update')) return;
      try {
        // Validate coordinates
        if (typeof lat !== 'number' || typeof lng !== 'number' ||
            lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          return;
        }

        // Use cached user data (refreshes every 30s)
        let user = getCachedUser(socket.userId);
        if (!user) {
          user = await User.findById(socket.userId)
            .select('name avatar isLiveSharing isLocationPublic settings followers following')
            .lean();
          if (!user) return;
          setCachedUser(socket.userId, user);
        }

        if (!user.isLiveSharing) return;

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

        // Also broadcast to nearby users for public discovery (not just followers)
        if (user.isLocationPublic) {
          const nearbyUsers = getNearbyLocations(lat, lng, 5, socket.userId);
          for (const entry of nearbyUsers) {
            // Skip users already notified as mutual followers
            const isMutualFollower = mutualFollowers.some(f => f.toString() === entry.userId);
            if (isMutualFollower) continue;

            const nearbySocketId = onlineUsers.get(entry.userId);
            if (nearbySocketId) {
              io.to(nearbySocketId).emit('nearby_user_location', {
                userId: socket.userId,
                name: user.name,
                avatar: user.avatar,
                lat, lng, heading,
                timestamp: Date.now(),
              });
            }
          }
        }
      } catch (error) {
        console.error('[Socket] Location update error:', error.message);
      }
    });

    // Stop sharing — notify followers and nearby users, then remove from store
    socket.on('stop_sharing', async () => {
      if (isSocketRateLimited(socket.userId, 'stop_sharing')) return;

      // Get current location before removing (needed to find nearby users)
      const currentLoc = getLocation(socket.userId);

      removeLocation(socket.userId);
      invalidateUserCache(socket.userId);
      const user = await User.findByIdAndUpdate(
        socket.userId,
        { isLiveSharing: false },
        { new: true },
      ).select('followers').lean();
      if (user) {
        for (const followerId of user.followers) {
          const followerSocketId = onlineUsers.get(followerId.toString());
          if (followerSocketId) {
            io.to(followerSocketId).emit('friend_offline', { userId: socket.userId });
          }
        }
      }

      // Notify nearby users too
      if (currentLoc) {
        const nearbyUsers = getNearbyLocations(currentLoc.lat, currentLoc.lng, 5, socket.userId);
        for (const entry of nearbyUsers) {
          const nearbySocketId = onlineUsers.get(entry.userId);
          if (nearbySocketId) {
            io.to(nearbySocketId).emit('nearby_user_offline', { userId: socket.userId });
          }
        }
      }
    });

    // Messaging
    socket.on('message_send', ({ conversationId, message }) => {
      if (isSocketRateLimited(socket.userId, 'message_send')) return;
      socket.to(`conversation:${conversationId}`).emit('new_message', {
        conversationId,
        message,
      });
    });

    // Message edit (broadcast edited message to conversation)
    socket.on('message_edit', ({ conversationId, message }) => {
      if (isSocketRateLimited(socket.userId, 'message_edit')) return;
      socket.to(`conversation:${conversationId}`).emit('message_edited', {
        conversationId,
        message,
      });
    });

    // Reactions (broadcast reaction changes to conversation)
    socket.on('reaction_add', ({ conversationId, message }) => {
      if (isSocketRateLimited(socket.userId, 'reaction_add')) return;
      socket.to(`conversation:${conversationId}`).emit('reaction_updated', {
        conversationId,
        message,
      });
    });

    socket.on('reaction_remove', ({ conversationId, message }) => {
      if (isSocketRateLimited(socket.userId, 'reaction_remove')) return;
      socket.to(`conversation:${conversationId}`).emit('reaction_updated', {
        conversationId,
        message,
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

      // Get location before removing to notify nearby users
      const currentLoc = getLocation(socket.userId);

      onlineUsers.delete(socket.userId);
      removeLocation(socket.userId);
      socketRateMap.delete(socket.userId);
      invalidateUserCache(socket.userId);

      // Notify nearby users about offline
      if (currentLoc) {
        const nearbyUsers = getNearbyLocations(currentLoc.lat, currentLoc.lng, 5, socket.userId);
        for (const entry of nearbyUsers) {
          const nearbySocketId = onlineUsers.get(entry.userId);
          if (nearbySocketId) {
            io.to(nearbySocketId).emit('nearby_user_offline', { userId: socket.userId });
          }
        }
      }
    });
  });
};

export const sendNotification = (io, recipientId, notification) => {
  const socketId = onlineUsers.get(recipientId.toString());
  if (socketId) {
    io.to(socketId).emit('notification', notification);
  }
};
