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
}, { timestamps: true });

eventSchema.index({ location: '2dsphere' });
eventSchema.index({ startTime: 1 });
eventSchema.index({ organizer: 1 });

export default mongoose.model('Event', eventSchema);
