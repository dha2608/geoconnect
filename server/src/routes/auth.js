import { Router } from 'express';
import passport from '../config/passport.js';
import {
  register, login, logout, refresh, guestLogin, oauthCallback, changePassword,
  forgotPassword, resetPassword, verifyEmail, resendVerification,
  setup2FA, verify2FA, disable2FA, login2FA, loginWithBackupCode,
  regenerateBackupCodes, get2FAStatus,
} from '../controllers/authController.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import {
  validateRegister, validateLogin, validateChangePassword,
  validateForgotPassword, validateResetPassword, validateVerifyEmail,
  validate2FACode, validate2FALogin, validate2FABackupLogin, validate2FADisable,
} from '../validators/index.js';

const router = Router();

router.post('/register', authLimiter, upload.single('avatar'), validateRegister, validate, register);
router.post('/login', authLimiter, validateLogin, validate, login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.post('/guest', guestLogin);
router.put('/password', authenticate, validateChangePassword, validate, changePassword);

// Password reset (public — no auth required)
router.post('/forgot-password', authLimiter, validateForgotPassword, validate, forgotPassword);
router.post('/reset-password', authLimiter, validateResetPassword, validate, resetPassword);

// Email verification
router.post('/verify-email', validateVerifyEmail, validate, verifyEmail);
router.post('/resend-verification', authenticate, resendVerification);

// 2FA routes (authenticated — for setup/management)
router.get('/2fa/status', authenticate, get2FAStatus);
router.post('/2fa/setup', authenticate, setup2FA);
router.post('/2fa/verify', authenticate, validate2FACode, validate, verify2FA);
router.post('/2fa/disable', authenticate, validate2FADisable, validate, disable2FA);
router.post('/2fa/regenerate-backup', authenticate, validate2FADisable, validate, regenerateBackupCodes);

// 2FA login routes (public — uses temp token instead of auth)
router.post('/2fa/login', authLimiter, validate2FALogin, validate, login2FA);
router.post('/2fa/backup', authLimiter, validate2FABackupLogin, validate, loginWithBackupCode);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login' }), oauthCallback);

// GitHub OAuth
router.get('/github', passport.authenticate('github', { scope: ['user:email'], session: false }));
router.get('/github/callback', passport.authenticate('github', { session: false, failureRedirect: '/login' }), oauthCallback);

export default router;
