import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
    index: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  text: {
    type: String,
    required: true,
    maxlength: 300,
    trim: true,
  },
}, { timestamps: true });

// Compound index: fetch comments for a post sorted by newest first
commentSchema.index({ post: 1, createdAt: -1 });

export default mongoose.model('Comment', commentSchema);
