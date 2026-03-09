import { Router } from 'express';
import passport from '../config/passport.js';
import { register, login, logout, refresh, guestLogin, oauthCallback, changePassword } from '../controllers/authController.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.post('/guest', guestLogin);
router.put('/password', authenticate, changePassword);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login' }), oauthCallback);

// GitHub OAuth
router.get('/github', passport.authenticate('github', { scope: ['user:email'], session: false }));
router.get('/github/callback', passport.authenticate('github', { session: false, failureRedirect: '/login' }), oauthCallback);

export default router;
