import { Router } from 'express';
import passport from '../config/passport.js';
import {
  register, login, logout, refresh, guestLogin, oauthCallback, changePassword,
  forgotPassword, resetPassword, verifyEmail, resendVerification,
} from '../controllers/authController.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import {
  validateRegister, validateLogin, validateChangePassword,
  validateForgotPassword, validateResetPassword, validateVerifyEmail,
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

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login' }), oauthCallback);

// GitHub OAuth
router.get('/github', passport.authenticate('github', { scope: ['user:email'], session: false }));
router.get('/github/callback', passport.authenticate('github', { session: false, failureRedirect: '/login' }), oauthCallback);

export default router;
