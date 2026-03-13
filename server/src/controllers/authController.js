import crypto from 'crypto';
import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, hashToken } from '../utils/jwt.js';
import { sendPasswordResetEmail, sendEmailVerification } from '../utils/email.js';

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

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password });

    // Generate email verification token
    const verifyToken = user.createToken('emailVerification');
    await user.save({ validateBeforeSave: false });
    await sendEmailVerification(email, verifyToken);

    const accessToken = await issueTokens(user, res);

    res.status(201).json({ user: user.toPublicJSON(), accessToken });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const accessToken = await issueTokens(user, res);
    res.json({ user: user.toPublicJSON(), accessToken });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

export const logout = async (req, res) => {
  try {
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
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  }
};

// ─── POST /api/auth/refresh  (with token rotation) ───────────────────────────

export const refresh = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({ message: 'No refresh token' });
    }

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.userId).select('+refreshTokenHash');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Rotation check — if hash doesn't match, token was already used (possible theft)
    const incomingHash = hashToken(token);
    if (!user.refreshTokenHash || user.refreshTokenHash !== incomingHash) {
      // Potential token reuse attack — invalidate all sessions
      user.refreshTokenHash = null;
      await user.save({ validateBeforeSave: false });
      res.clearCookie('refreshToken');
      return res.status(401).json({ message: 'Token reuse detected, please log in again' });
    }

    // Issue new token pair (rotation)
    const accessToken = await issueTokens(user, res);
    res.json({ user: user.toPublicJSON(), accessToken });
  } catch (error) {
    res.clearCookie('refreshToken');
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

// ─── POST /api/auth/guest ─────────────────────────────────────────────────────

export const guestLogin = async (req, res) => {
  try {
    const guestName = `Guest_${Date.now().toString(36)}`;
    const user = await User.create({
      name: guestName,
      email: `${guestName.toLowerCase()}@guest.geoconnect`,
      isGuest: true,
      isEmailVerified: true, // guests don't need verification
    });

    const accessToken = generateAccessToken(user._id);
    res.status(201).json({ user: user.toPublicJSON(), accessToken });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── OAuth callback ───────────────────────────────────────────────────────────

export const oauthCallback = async (req, res) => {
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
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/login?error=oauth_failed`);
  }
};

// ─── PUT /api/auth/password ───────────────────────────────────────────────────

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update password' });
  }
};

// ─── POST /api/auth/forgot-password ───────────────────────────────────────────

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If that email exists, a reset link has been sent' });
    }

    const resetToken = user.createToken('passwordReset');
    await user.save({ validateBeforeSave: false });

    await sendPasswordResetEmail(email, resetToken);

    res.json({ message: 'If that email exists, a reset link has been sent' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── POST /api/auth/reset-password ────────────────────────────────────────────

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    // Invalidate existing sessions
    user.refreshTokenHash = null;
    await user.save();

    res.json({ message: 'Password has been reset. Please log in with your new password.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── POST /api/auth/verify-email ──────────────────────────────────────────────

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── POST /api/auth/resend-verification ───────────────────────────────────────

export const resendVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    const verifyToken = user.createToken('emailVerification');
    await user.save({ validateBeforeSave: false });

    await sendEmailVerification(user.email, verifyToken);

    res.json({ message: 'Verification email sent' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
