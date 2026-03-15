import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  pin: { type: mongoose.Schema.Types.ObjectId, ref: 'Pin', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  text: { type: String, maxlength: 500, default: '' },
  photos: [{ type: String }],
  helpfulVotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  ownerResponse: {
    text: { type: String, maxlength: 500 },
    respondedAt: { type: Date },
  },
}, { timestamps: true });

reviewSchema.index({ pin: 1, user: 1 }, { unique: true });
reviewSchema.index({ pin: 1, createdAt: -1 });

export default mongoose.model('Review', reviewSchema);
