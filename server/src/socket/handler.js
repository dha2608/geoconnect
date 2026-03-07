import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const onlineUsers = new Map(); // userId -> socketId

export const setupSocket = (io) => {
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

    // Join personal room
    socket.on('join_room', ({ userId }) => {
      socket.join(`user:${userId}`);
    });

    // Join conversation room for messaging + typing events
    socket.on('join_conversation', ({ conversationId }) => {
      if (!conversationId) return;
      socket.join(`conversation:${conversationId}`);
    });

    // Location sharing
    socket.on('location_update', async ({ lat, lng, heading }) => {
      try {
        const user = await User.findById(socket.userId);
        if (!user || !user.isLiveSharing) return;

        // Update DB
        await User.findByIdAndUpdate(socket.userId, {
          location: { type: 'Point', coordinates: [lng, lat] },
          lastLocationUpdate: new Date(),
        });

        // Broadcast to mutual followers
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
      socket.to(`conversation:${conversationId}`).emit('new_message', {
        conversationId,
        text,
        sender: socket.userId,
        locationPin,
        timestamp: Date.now(),
      });
    });

    socket.on('typing_start', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('typing', {
        userId: socket.userId,
        isTyping: true,
      });
    });

    socket.on('typing_stop', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('typing', {
        userId: socket.userId,
        isTyping: false,
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.userId}`);
      onlineUsers.delete(socket.userId);
    });
  });
};

export const sendNotification = (io, recipientId, notification) => {
  const socketId = onlineUsers.get(recipientId.toString());
  if (socketId) {
    io.to(socketId).emit('notification', notification);
  }
};
