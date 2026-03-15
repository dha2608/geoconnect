import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, maxlength: 1000, default: '' },
  location: {
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  address: { type: String, default: '' },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  maxCapacity: { type: Number, default: 0 }, // 0 = unlimited
  isPublic: { type: Boolean, default: true },
  coverImage: { type: String, default: '' },
  category: { type: String, enum: ['meetup', 'party', 'sports', 'music', 'food', 'other'], default: 'other' },

  // ─── Tags ───────────────────────────────────────────────────────────
  tags: [{ type: String, trim: true, lowercase: true, maxlength: 30 }],

  // ─── Recurring Events ──────────────────────────────────────────────
  recurrence: {
    type: { type: String, enum: ['none', 'daily', 'weekly', 'monthly'], default: 'none' },
    interval: { type: Number, default: 1, min: 1, max: 52 },        // every N days/weeks/months
    daysOfWeek: [{ type: Number, min: 0, max: 6 }],                  // 0=Sun..6=Sat (for weekly)
    endDate: { type: Date },                                          // when recurrence stops
  },
  parentEvent: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },

  // ─── Comments ──────────────────────────────────────────────────────
  commentCount: { type: Number, default: 0 },

  // ─── Reminders ─────────────────────────────────────────────────────
  reminders: [{
    minutesBefore: { type: Number, required: true },   // e.g. 15, 30, 60, 1440
  }],
  remindersSent: [{
    minutesBefore: { type: Number },
    sentAt: { type: Date },
  }],
}, { timestamps: true });

// ─── Indexes ────────────────────────────────────────────────────────────────
eventSchema.index({ location: '2dsphere' });
eventSchema.index({ startTime: 1 });
eventSchema.index({ organizer: 1 });
eventSchema.index({ title: 'text', description: 'text' });

eventSchema.index({ category: 1, startTime: 1 });
eventSchema.index({ organizer: 1, startTime: -1 });
eventSchema.index({ isPublic: 1, location: '2dsphere' });
eventSchema.index({ tags: 1 });
eventSchema.index({ parentEvent: 1, startTime: 1 });

export default mongoose.model('Event', eventSchema);
