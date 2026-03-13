import mongoose from 'mongoose';

const pinSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, maxlength: 1000, default: '' },
  category: { 
    type: String, 
    enum: ['food', 'entertainment', 'shopping', 'outdoors', 'culture', 'travel', 'sports', 'health', 'education', 'other'], 
    default: 'other' 
  },
  location: {
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  address: { type: String, default: '' },
  images: [{ type: String }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  visibility: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
  tags: [{ type: String, trim: true }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  checkIns: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    checkedInAt: { type: Date, default: Date.now },
  }],
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
}, { timestamps: true });

pinSchema.index({ location: '2dsphere' });
pinSchema.index({ createdBy: 1 });
pinSchema.index({ category: 1 });

export default mongoose.model('Pin', pinSchema);
