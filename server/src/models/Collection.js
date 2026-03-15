import mongoose from 'mongoose';

const collaboratorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['editor', 'viewer'], default: 'viewer' },
  addedAt: { type: Date, default: Date.now },
}, { _id: false });

const collectionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  description: { type: String, maxlength: 200, default: '' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pin' }],
  coverImage: { type: String, default: '' },
  isPublic: { type: Boolean, default: false },
  emoji: { type: String, default: '📌' },
  collaborators: [collaboratorSchema],
  shareToken: { type: String, default: null, index: { sparse: true } },
}, { timestamps: true });

collectionSchema.index({ owner: 1, createdAt: -1 });
collectionSchema.index({ 'collaborators.user': 1 });

export default mongoose.model('Collection', collectionSchema);
