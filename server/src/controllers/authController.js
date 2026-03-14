import crypto from 'crypto';
import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, hashToken } from '../utils/jwt.js';
import { sendPasswordResetEmail, sendEmailVerification } from '../utils/email.js';
import { uploadToCloudinary } from '../middleware/upload.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError, ERR } from '../utils/errors.js';
import { ok, created, message } from '../utils/response.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/** Issue tokens, store hashed refresh in DB, set cookie */
const issueTokens = async (user, res) => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Store hashed refresh token for rotation / revocation
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save({ validateBeforeSave: false });

  res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
  return accessToken;
};

// ─── POST /api/auth/register ──────────────────────────────────────────────────

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw AppError.badRequest('Email already registered');
  }

  // Upload avatar to Cloudinary if provided
  let avatarUrl = '';
  if (req.file) {
    try {
      const result = await uploadToCloudinary(req.file.buffer, 'geoconnect/avatars');
      avatarUrl = result.secure_url;
    } catch (uploadErr) {
      console.error('[register] Avatar upload failed:', uploadErr.message);
      // Continue without avatar — not a blocker
    }
  }

  const user = await User.create({ name, email, password, avatar: avatarUrl });

  // Generate email verification token
  const verifyToken = user.createToken('emailVerification');
  await user.save({ validateBeforeSave: false });
  await sendEmailVerification(email, verifyToken);

  const accessToken = await issueTokens(user, res);

  return created(res, { user: user.toPublicJSON(), accessToken });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !user.password) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const accessToken = await issueTokens(user, res);
  return ok(res, { user: user.toPublicJSON(), accessToken });
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

export const logout = asyncHandler(async (req, res) => {
  // Clear stored refresh token if user is authenticated
  const token = req.cookies.refreshToken;
  if (token) {
    try {
      const decoded = verifyRefreshToken(token);
      await User.findByIdAndUpdate(decoded.userId, { refreshTokenHash: null });
    } catch {
      // Token invalid — still clear cookie
    }
  }
  res.clearCookie('refreshToken');
  return message(res, 'Logged out successfully');
});

// ─── POST /api/auth/refresh  (with token rotation) ───────────────────────────

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) {
    throw AppError.unauthorized('No refresh token');
  }

  // verifyRefreshToken throws on invalid/expired token — clear cookie before propagating
  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    res.clearCookie('refreshToken');
    throw AppError.unauthorized('Invalid refresh token');
  }

  const user = await User.findById(decoded.userId).select('+refreshTokenHash');
  if (!user) {
    throw AppError.unauthorized('User not found');
  }

  // Rotation check — if hash doesn't match, token was already used (possible theft)
  const incomingHash = hashToken(token);
  if (!user.refreshTokenHash || user.refreshTokenHash !== incomingHash) {
    // Potential token reuse attack — invalidate all sessions
    user.refreshTokenHash = null;
    await user.save({ validateBeforeSave: false });
    res.clearCookie('refreshToken');
    throw AppError.unauthorized('Token reuse detected, please log in again');
  }

  // Issue new token pair (rotation)
  const accessToken = await issueTokens(user, res);
  return ok(res, { user: user.toPublicJSON(), accessToken });
});

// ─── POST /api/auth/guest ─────────────────────────────────────────────────────

export const guestLogin = asyncHandler(async (req, res) => {
  const guestName = `Guest_${Date.now().toString(36)}`;
  const user = await User.create({
    name: guestName,
    email: `${guestName.toLowerCase()}@guest.geoconnect`,
    isGuest: true,
    isEmailVerified: true, // guests don't need verification
  });

  const accessToken = generateAccessToken(user._id);
  return created(res, { user: user.toPublicJSON(), accessToken });
});

// ─── OAuth callback ───────────────────────────────────────────────────────────

export const oauthCallback = asyncHandler(async (req, res) => {
  try {
    const user = req.user;
    // OAuth users are inherently email-verified
    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
      await user.save({ validateBeforeSave: false });
    }

    const accessToken = await issueTokens(user, res);

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/auth/callback?token=${accessToken}`);
  } catch (error) {
    // OAuth errors redirect instead of returning JSON — keep try-catch for redirect
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/login?error=oauth_failed`);
  }
});

// ─── PUT /api/auth/password ───────────────────────────────────────────────────

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!user) throw new AppError(ERR.USER_NOT_FOUND);

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw AppError.badRequest('Current password is incorrect');

  user.password = newPassword;
  await user.save();

  return message(res, 'Password updated successfully');
});

// ─── POST /api/auth/forgot-password ───────────────────────────────────────────

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  // Always return success to prevent email enumeration
  if (!user) {
    return message(res, 'If that email exists, a reset link has been sent');
  }

  const resetToken = user.createToken('passwordReset');
  await user.save({ validateBeforeSave: false });

  await sendPasswordResetEmail(email, resetToken);

  return message(res, 'If that email exists, a reset link has been sent');
});

// ─── POST /api/auth/reset-password ────────────────────────────────────────────

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw AppError.badRequest('Invalid or expired reset token');
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  // Invalidate existing sessions
  user.refreshTokenHash = null;
  await user.save();

  return message(res, 'Password has been reset. Please log in with your new password.');
});

// ─── POST /api/auth/verify-email ──────────────────────────────────────────────

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw AppError.badRequest('Invalid or expired verification token');
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  return message(res, 'Email verified successfully');
});

// ─── POST /api/auth/resend-verification ───────────────────────────────────────

export const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new AppError(ERR.USER_NOT_FOUND);

  if (user.isEmailVerified) {
    throw AppError.badRequest('Email is already verified');
  }

  const verifyToken = user.createToken('emailVerification');
  await user.save({ validateBeforeSave: false });

  await sendEmailVerification(user.email, verifyToken);

  return message(res, 'Verification email sent');
});
