import cron from 'node-cron';
import Event from '../models/Event.js';
import Notification from '../models/Notification.js';
import { sendNotification } from '../socket/handler.js';

/**
 * Event Reminder Job
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs every 15 minutes. Finds events starting in the next 45–60 minute window
 * and sends `event_reminder` notifications to all attendees who haven't been
 * notified yet (de-duplicated by checking existing notifications).
 *
 * @param {import('socket.io').Server} io — Socket.io server instance for real-time push
 */
export function startEventReminderJob(io) {
  // Run every 15 minutes: :00, :15, :30, :45
  cron.schedule('*/15 * * * *', async () => {
    try {
      const now = new Date();
      const from = new Date(now.getTime() + 45 * 60 * 1000); // 45 min from now
      const to = new Date(now.getTime() + 60 * 60 * 1000);   // 60 min from now

      // Find upcoming events in the reminder window with attendees
      const events = await Event.find({
        startTime: { $gte: from, $lte: to },
        attendees: { $exists: true, $ne: [] },
      }).populate('organizer', 'name avatar');

      if (!events.length) return;

      let sentCount = 0;

      for (const event of events) {
        for (const attendeeId of event.attendees) {
          // Check if we already sent a reminder for this event+attendee
          const existing = await Notification.findOne({
            recipient: attendeeId,
            type: 'event_reminder',
            'data.eventId': event._id.toString(),
          });

          if (existing) continue; // Already notified

          // Create notification
          const notification = await Notification.create({
            recipient: attendeeId,
            sender: event.organizer._id,
            type: 'event_reminder',
            data: {
              eventId: event._id.toString(),
              eventTitle: event.title,
              startTime: event.startTime.toISOString(),
              preview: `${event.title} starts in about 1 hour`,
            },
          });

          // Populate sender for real-time payload
          await notification.populate('sender', 'name avatar');

          const payload = {
            ...notification.toObject(),
            read: notification.isRead,
          };

          // Push via Socket.io
          sendNotification(io, attendeeId, payload);
          sentCount++;
        }
      }

      if (sentCount > 0) {
        console.log(`[EventReminder] Sent ${sentCount} reminder(s) for ${events.length} event(s)`);
      }
    } catch (error) {
      console.error('[EventReminder] Job error:', error.message);
    }
  });

  console.log('[EventReminder] Cron job scheduled (every 15 min)');
}
