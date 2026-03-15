import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, hashToken } from '../utils/jwt.js';
import { sendPasswordResetEmail, sendEmailVerification, sendWelcomeEmail } from '../utils/email.js';
import { uploadToCloudinary } from '../middleware/upload.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError, ERR } from '../utils/errors.js';
import { ok, created, message } from '../utils/response.js';
import { blacklistToken } from '../utils/tokenBlacklist.js';

// ─── 2FA Helpers ──────────────────────────────────────────────────────────────

const TEMP_TOKEN_SECRET = process.env.TEMP_TOKEN_SECRET || process.env.JWT_SECRET || 'temp-2fa-secret';
const TEMP_TOKEN_EXPIRY = '5m'; // 5 minutes to enter 2FA code

/** Generate a short-lived temp token for 2FA login flow */
const generateTempToken = (userId) => {
  return jwt.sign({ userId, purpose: '2fa' }, TEMP_TOKEN_SECRET, { expiresIn: TEMP_TOKEN_EXPIRY });
};

/** Verify a temp 2FA token */
const verifyTempToken = (token) => {
  const decoded = jwt.verify(token, TEMP_TOKEN_SECRET);
  if (decoded.purpose !== '2fa') throw new Error('Invalid token purpose');
  return decoded;
};

/** Generate backup codes (10 codes, 8 chars each) */
const generateBackupCodes = () => {
  return Array.from({ length: 10 }, () => crypto.randomBytes(4).toString('hex'));
};

/** Hash a backup code for secure storage */
const hashBackupCode = (code) => {
  return crypto.createHash('sha256').update(code).digest('hex');
};

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
  sendWelcomeEmail(user.email, user.name); // fire-and-forget

  const accessToken = await issueTokens(user, res);

  return created(res, { user: user.toPublicJSON(), accessToken });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password +twoFactorEnabled +twoFactorSecret');
  if (!user || !user.password) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw AppError.unauthorized('Invalid email or password');
  }

  // If 2FA is enabled, return temp token instead of full auth
  if (user.twoFactorEnabled) {
    const tempToken = generateTempToken(user._id);
    return ok(res, { requires2FA: true, tempToken });
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

  // Blacklist the current access token
  const accessToken = req.headers.authorization?.split(' ')[1] || req.token;
  if (accessToken) {
    try {
      const decoded = jwt.decode(accessToken);
      const ttl = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 900;
      await blacklistToken(accessToken, ttl);
    } catch { /* best-effort */ }
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

  // Blacklist the current access token so it can't be reused after password change
  const accessToken = req.headers.authorization?.split(' ')[1] || req.token;
  if (accessToken) {
    try {
      const decoded = jwt.decode(accessToken);
      const ttl = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 900;
      await blacklistToken(accessToken, ttl);
    } catch { /* best-effort */ }
  }

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

// ─── POST /api/auth/2fa/setup ─────────────────────────────────────────────────

export const setup2FA = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+twoFactorEnabled +twoFactorSecret');
  if (!user) throw new AppError(ERR.USER_NOT_FOUND);

  if (user.twoFactorEnabled) {
    throw AppError.badRequest('2FA is already enabled');
  }

  // Generate a new secret
  const secret = speakeasy.generateSecret({
    name: `GeoConnect:${user.email}`,
    issuer: 'GeoConnect',
    length: 32,
  });

  // Store secret temporarily (not enabled yet until verified)
  user.twoFactorSecret = secret.base32;
  await user.save({ validateBeforeSave: false });

  // Generate QR code as data URL
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

  return ok(res, {
    secret: secret.base32,
    qrCode: qrCodeUrl,
  });
});

// ─── POST /api/auth/2fa/verify ────────────────────────────────────────────────

export const verify2FA = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const user = await User.findById(req.user._id).select('+twoFactorSecret +twoFactorEnabled');
  if (!user) throw new AppError(ERR.USER_NOT_FOUND);

  if (user.twoFactorEnabled) {
    throw AppError.badRequest('2FA is already enabled');
  }

  if (!user.twoFactorSecret) {
    throw AppError.badRequest('2FA setup not initiated. Call /2fa/setup first');
  }

  // Verify the TOTP code
  const isValid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: code,
    window: 1, // Allow 1 step before/after for clock skew
  });

  if (!isValid) {
    throw AppError.badRequest('Invalid verification code');
  }

  // Enable 2FA and generate backup codes
  const rawBackupCodes = generateBackupCodes();
  user.twoFactorEnabled = true;
  user.twoFactorBackupCodes = rawBackupCodes.map(hashBackupCode);
  await user.save({ validateBeforeSave: false });

  return ok(res, {
    message: '2FA enabled successfully',
    backupCodes: rawBackupCodes, // Show once, user must save them
  });
});

// ─── POST /api/auth/2fa/disable ───────────────────────────────────────────────

export const disable2FA = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const user = await User.findById(req.user._id).select('+password +twoFactorEnabled');
  if (!user) throw new AppError(ERR.USER_NOT_FOUND);

  if (!user.twoFactorEnabled) {
    throw AppError.badRequest('2FA is not enabled');
  }

  // Require password confirmation for security
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw AppError.badRequest('Invalid password');
  }

  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  user.twoFactorBackupCodes = [];
  await user.save({ validateBeforeSave: false });

  return message(res, '2FA disabled successfully');
});

// ─── POST /api/auth/2fa/login ─────────────────────────────────────────────────

export const login2FA = asyncHandler(async (req, res) => {
  const { tempToken, code } = req.body;

  // Verify temp token
  let decoded;
  try {
    decoded = verifyTempToken(tempToken);
  } catch {
    throw AppError.unauthorized('Invalid or expired 2FA session. Please log in again');
  }

  const user = await User.findById(decoded.userId).select('+twoFactorSecret +twoFactorEnabled');
  if (!user) throw AppError.unauthorized('User not found');

  if (!user.twoFactorEnabled) {
    throw AppError.badRequest('2FA is not enabled for this account');
  }

  // Verify TOTP code
  const isValid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: code,
    window: 1,
  });

  if (!isValid) {
    throw AppError.unauthorized('Invalid 2FA code');
  }

  // 2FA verified — issue real tokens
  const accessToken = await issueTokens(user, res);
  return ok(res, { user: user.toPublicJSON(), accessToken });
});

// ─── POST /api/auth/2fa/backup ────────────────────────────────────────────────

export const loginWithBackupCode = asyncHandler(async (req, res) => {
  const { tempToken, backupCode } = req.body;

  // Verify temp token
  let decoded;
  try {
    decoded = verifyTempToken(tempToken);
  } catch {
    throw AppError.unauthorized('Invalid or expired 2FA session. Please log in again');
  }

  const user = await User.findById(decoded.userId).select('+twoFactorBackupCodes +twoFactorEnabled');
  if (!user) throw AppError.unauthorized('User not found');

  if (!user.twoFactorEnabled) {
    throw AppError.badRequest('2FA is not enabled for this account');
  }

  // Check backup code
  const hashedCode = hashBackupCode(backupCode.trim());
  const codeIndex = user.twoFactorBackupCodes.indexOf(hashedCode);

  if (codeIndex === -1) {
    throw AppError.unauthorized('Invalid backup code');
  }

  // Remove used backup code (one-time use)
  user.twoFactorBackupCodes.splice(codeIndex, 1);
  await user.save({ validateBeforeSave: false });

  // Issue real tokens
  const accessToken = await issueTokens(user, res);
  return ok(res, {
    user: user.toPublicJSON(),
    accessToken,
    backupCodesRemaining: user.twoFactorBackupCodes.length,
  });
});

// ─── POST /api/auth/2fa/regenerate-backup ─────────────────────────────────────

export const regenerateBackupCodes = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const user = await User.findById(req.user._id).select('+password +twoFactorEnabled');
  if (!user) throw new AppError(ERR.USER_NOT_FOUND);

  if (!user.twoFactorEnabled) {
    throw AppError.badRequest('2FA is not enabled');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw AppError.badRequest('Invalid password');
  }

  const rawBackupCodes = generateBackupCodes();
  user.twoFactorBackupCodes = rawBackupCodes.map(hashBackupCode);
  await user.save({ validateBeforeSave: false });

  return ok(res, {
    message: 'Backup codes regenerated',
    backupCodes: rawBackupCodes,
  });
});

// ─── GET /api/auth/2fa/status ─────────────────────────────────────────────────

export const get2FAStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+twoFactorEnabled +twoFactorBackupCodes');
  if (!user) throw new AppError(ERR.USER_NOT_FOUND);

  return ok(res, {
    enabled: user.twoFactorEnabled || false,
    backupCodesRemaining: user.twoFactorBackupCodes?.length || 0,
  });
});
