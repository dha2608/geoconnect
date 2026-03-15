import mongoose from 'mongoose';

const reactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  emoji: { type: String, required: true },
}, { _id: false });

const commentSchema = new mongoose.Schema({
  // ─── Target: either a Post or an Event (one required) ───────────
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    index: true,
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
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
    maxlength: 500,
    trim: true,
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  isEdited: {
    type: Boolean,
    default: false,
  },
  // ─── Phase B: Nested replies ────────────────────────────────────
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
    index: true,
  },
  replyCount: {
    type: Number,
    default: 0,
  },
  // ─── Phase B: Reactions ─────────────────────────────────────────
  reactions: [reactionSchema],
}, { timestamps: true });

// Require at least one of post or event
commentSchema.pre('validate', function (next) {
  if (!this.post && !this.event) {
    return next(new Error('Comment must belong to either a post or an event'));
  }
  if (this.post && this.event) {
    return next(new Error('Comment cannot belong to both a post and an event'));
  }
  next();
});

// Compound indexes for efficient queries
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ event: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1, createdAt: 1 });

export default mongoose.model('Comment', commentSchema);
