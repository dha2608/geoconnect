import mongoose from 'mongoose';

const collectionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  description: { type: String, maxlength: 200, default: '' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pin' }],
  coverImage: { type: String, default: '' },
  isPublic: { type: Boolean, default: false },
  emoji: { type: String, default: '📌' },
}, { timestamps: true });

collectionSchema.index({ owner: 1, createdAt: -1 });

export default mongoose.model('Collection', collectionSchema);
