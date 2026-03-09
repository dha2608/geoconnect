import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, minlength: 6, select: false },
  googleId: { type: String, unique: true, sparse: true },
  githubId: { type: String, unique: true, sparse: true },
  avatar: { type: String, default: '' },
  bio: { type: String, maxlength: 200, default: '' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
  },
  isLocationPublic: { type: Boolean, default: true },
  isLiveSharing: { type: Boolean, default: false },
  lastLocationUpdate: { type: Date },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  savedPins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pin' }],
  isGuest: { type: Boolean, default: false },
  settings: {
    privacy: {
      shareLocation: { type: Boolean, default: true },
      nearbyDiscovery: { type: Boolean, default: true },
      publicProfile: { type: Boolean, default: true },
    },
    notifications: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      newFollower: { type: Boolean, default: true },
      nearbyEvent: { type: Boolean, default: true },
    },
    appearance: {
      mapStyle: { type: String, default: 'dark', enum: ['dark', 'street', 'light', 'satellite'] },
      distanceUnit: { type: String, default: 'km', enum: ['km', 'miles'] },
    },
  },
}, { timestamps: true });

userSchema.index({ location: '2dsphere' });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.googleId;
  delete obj.githubId;
  return obj;
};

export default mongoose.model('User', userSchema);
