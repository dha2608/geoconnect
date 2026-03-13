import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: { type: String, enum: ['user', 'post', 'pin', 'event', 'review', 'message'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  reason: {
    type: String,
    enum: ['spam', 'harassment', 'hate_speech', 'violence', 'inappropriate', 'impersonation', 'other'],
    required: true,
  },
  description: { type: String, maxlength: 500 },
  status: { type: String, enum: ['pending', 'reviewed', 'resolved', 'dismissed'], default: 'pending' },
}, { timestamps: true });

reportSchema.index({ reporter: 1, targetType: 1, targetId: 1 }, { unique: true });
reportSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Report', reportSchema);
