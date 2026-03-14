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
}, { timestamps: true });

postSchema.index({ location: '2dsphere' });
postSchema.index({ author: 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ text: 'text' });
postSchema.index({ author: 1, createdAt: -1 }); // User's posts sorted by date

export default mongoose.model('Post', postSchema);
