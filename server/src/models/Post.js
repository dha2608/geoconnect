import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 500 },
  images: [{ type: String }],
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
  },
  address: { type: String, default: '' },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  saves: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  commentCount: { type: Number, default: 0 },
  visibility: { type: String, enum: ['public', 'followers', 'private'], default: 'public' },
  hashtags: [{ type: String }],
  shareCount: { type: Number, default: 0 },
  repostOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
}, { timestamps: true });

postSchema.index({ location: '2dsphere' });
postSchema.index({ author: 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ text: 'text' });
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ visibility: 1, createdAt: -1 });

export default mongoose.model('Post', postSchema);
