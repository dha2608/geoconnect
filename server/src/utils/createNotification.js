import Notification from '../models/Notification.js';
import { sendNotification } from '../socket/handler.js';

/**
 * Create a notification in the database and push it via Socket.io in real-time.
 *
 * @param {object} req - Express request (used to access io via req.app.get('io'))
 * @param {object} options
 * @param {string} options.recipientId - User ID who receives the notification
 * @param {string} options.senderId - User ID who triggered the action
 * @param {string} options.type - One of: 'follow', 'like', 'comment', 'live_share', 'message', 'event_reminder', 'rsvp', 'review'
 * @param {object} [options.data] - Extra data (postId, pinId, eventId, text preview, etc.)
 * @returns {Promise<object|null>} The created notification document, or null if skipped
 */
export async function createNotification(req, { recipientId, senderId, type, data }) {
  // Don't notify yourself
  if (recipientId.toString() === senderId.toString()) return null;

  try {
    const notification = await Notification.create({
      recipient: recipientId,
      sender: senderId,
      type,
      data,
    });

    // Populate sender info for real-time push
    await notification.populate('sender', 'name avatar');

    // Normalize for client (isRead -> read)
    const payload = {
      ...notification.toObject(),
      read: notification.isRead,
    };

    // Push via Socket.io
    const io = req.app.get('io');
    if (io) {
      sendNotification(io, recipientId, payload);
    }

    return notification;
  } catch (error) {
    // Log but don't throw — notification failure shouldn't break the main action
    console.error(`[Notification] Failed to create ${type} notification:`, error.message);
    return null;
  }
}
