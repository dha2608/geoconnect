import cron from 'node-cron';
import Event from '../models/Event.js';
import Notification from '../models/Notification.js';
import { sendNotification } from '../socket/handler.js';

/**
 * Event Reminder Job
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs every 5 minutes. Checks each event's configurable `reminders` array
 * and sends `event_reminder` notifications to attendees at the right time.
 *
 * Each event can have multiple reminders (e.g., 60min, 30min, 15min before).
 * Tracks which reminders have been sent via `remindersSent` array.
 *
 * Falls back to 60-minute reminder if no reminders configured.
 *
 * @param {import('socket.io').Server} io — Socket.io server instance
 */
export function startEventReminderJob(io) {
  // Run every 5 minutes for finer granularity
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();
      // Look ahead window: events starting in the next 24 hours
      const lookAhead = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Find upcoming events with attendees
      const events = await Event.find({
        startTime: { $gte: now, $lte: lookAhead },
        attendees: { $exists: true, $ne: [] },
      }).populate('organizer', 'name avatar');

      if (!events.length) return;

      let sentCount = 0;

      for (const event of events) {
        // Determine which reminders to check
        const reminders = event.reminders?.length > 0
          ? event.reminders
          : [{ minutesBefore: 60 }]; // Default: 1 hour before

        for (const reminder of reminders) {
          const { minutesBefore } = reminder;

          // Check if this reminder was already sent
          const alreadySent = event.remindersSent?.some(
            (r) => r.minutesBefore === minutesBefore
          );
          if (alreadySent) continue;

          // Calculate the reminder trigger time
          const triggerTime = new Date(event.startTime.getTime() - minutesBefore * 60 * 1000);

          // Check if we're within the 5-minute window for this reminder
          const diffMs = triggerTime.getTime() - now.getTime();
          if (diffMs > 5 * 60 * 1000 || diffMs < -5 * 60 * 1000) continue;

          // Time to send this reminder!
          const timeLabel = formatTimeBefore(minutesBefore);

          for (const attendeeId of event.attendees) {
            // De-duplicate: check if notification already exists
            const existing = await Notification.findOne({
              recipient: attendeeId,
              type: 'event_reminder',
              'data.eventId': event._id.toString(),
              'data.minutesBefore': minutesBefore,
            });

            if (existing) continue;

            const notification = await Notification.create({
              recipient: attendeeId,
              sender: event.organizer._id,
              type: 'event_reminder',
              data: {
                eventId: event._id.toString(),
                eventTitle: event.title,
                startTime: event.startTime.toISOString(),
                minutesBefore,
                preview: `${event.title} starts in ${timeLabel}`,
              },
            });

            await notification.populate('sender', 'name avatar');

            const payload = {
              ...notification.toObject(),
              read: notification.isRead,
            };

            sendNotification(io, attendeeId, payload);
            sentCount++;
          }

          // Mark this reminder as sent on the event
          await Event.findByIdAndUpdate(event._id, {
            $push: {
              remindersSent: {
                minutesBefore,
                sentAt: now,
              },
            },
          });
        }
      }

      if (sentCount > 0) {
        console.log(`[EventReminder] Sent ${sentCount} reminder(s)`);
      }
    } catch (error) {
      console.error('[EventReminder] Job error:', error.message);
    }
  });

  console.log('[EventReminder] Cron job scheduled (every 5 min)');
}

/**
 * Format minutes into human-readable time label
 */
function formatTimeBefore(minutes) {
  if (minutes < 60) return `${minutes} minutes`;
  if (minutes === 60) return '1 hour';
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hours`;
  }
  const days = Math.floor(minutes / 1440);
  return days === 1 ? '1 day' : `${days} days`;
}
