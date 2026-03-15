import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, minlength: 8, select: false },
  googleId: { type: String, unique: true, sparse: true },
  githubId: { type: String, unique: true, sparse: true },
  avatar: { type: String, default: '' },
  bio: { type: String, maxlength: 200, default: '' },
  // Auth security fields
  refreshTokenHash: { type: String, select: false },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, select: false },
  emailVerificationExpires: { type: Date, select: false },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  // 2FA fields
  twoFactorSecret: { type: String, select: false },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorBackupCodes: [{ type: String, select: false }],
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
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isGuest: { type: Boolean, default: false },
  role: { type: String, enum: ['user', 'admin', 'moderator'], default: 'user' },
  // Admin moderation fields
  isBanned: { type: Boolean, default: false },
  bannedAt: { type: Date },
  bannedReason: { type: String, maxlength: 500 },
  bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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
userSchema.index({ name: 'text', bio: 'text' });
userSchema.index({ followers: 1 });
userSchema.index({ following: 1 });

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
  delete obj.refreshTokenHash;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.twoFactorSecret;
  delete obj.twoFactorBackupCodes;
  return obj;
};

// Generate and hash a random token (for password reset / email verification)
userSchema.methods.createToken = function(field) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

  if (field === 'passwordReset') {
    this.passwordResetToken = hashed;
    this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  } else if (field === 'emailVerification') {
    this.emailVerificationToken = hashed;
    this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  }

  return rawToken; // return unhashed version for email link
};

export default mongoose.model('User', userSchema);
