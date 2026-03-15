import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { isTokenBlacklisted } from '../utils/tokenBlacklist.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    // Check blacklist (logout / password change)
    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({ message: 'Token revoked', code: 'TOKEN_REVOKED' });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.userId)
      .select('_id name avatar email role settings isLocationPublic isLiveSharing location blockedUsers followers following')
      .lean();
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    req.token = token; // Store for potential blacklisting on logout
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      if (await isTokenBlacklisted(token)) {
        req.user = null;
        return next();
      }
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      req.user = await User.findById(decoded.userId)
        .select('_id name avatar email role settings isLocationPublic isLiveSharing location blockedUsers followers following')
        .lean();
    }
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      console.warn(`[Auth] optionalAuth: invalid token (${error.name})`);
    }
    req.user = null;
  }
  next();
};
