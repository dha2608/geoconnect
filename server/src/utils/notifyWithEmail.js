import User from '../models/User.js';
import {
  sendNewFollowerEmail,
  sendCommentNotificationEmail,
  sendLikeNotificationEmail,
  sendEventReminderEmail,
} from './email.js';

/**
 * Send email notification to a user if they have email notifications enabled.
 * Fire-and-forget — never throws, never blocks the caller.
 *
 * @param {string} userId - Recipient user ID
 * @param {'follow'|'comment'|'like'|'event_reminder'} type
 * @param {object} data - Type-specific payload
 */
export async function notifyEmail(userId, type, data = {}) {
  try {
    const user = await User.findById(userId)
      .select('email settings.notifications.email name')
      .lean();

    if (!user || !user.settings?.notifications?.email) return;

    switch (type) {
      case 'follow':
        await sendNewFollowerEmail(user.email, data.followerName);
        break;
      case 'comment':
        await sendCommentNotificationEmail(user.email, data.commenterName, data.contentType, data.contentTitle);
        break;
      case 'like':
        await sendLikeNotificationEmail(user.email, data.likerName, data.contentType);
        break;
      case 'event_reminder':
        await sendEventReminderEmail(user.email, data.eventTitle, data.eventDate);
        break;
      default:
        break;
    }
  } catch (err) {
    // Never block the main flow — just log
    console.error(`[notifyEmail] Failed for ${userId}/${type}:`, err.message);
  }
}
