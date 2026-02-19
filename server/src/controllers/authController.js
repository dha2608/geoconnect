import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    
    const user = await User.create({ name, email, password });
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    
    res.status(201).json({ user: user.toPublicJSON(), accessToken });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

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
    
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    
    res.json({ user: user.toPublicJSON(), accessToken });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const logout = async (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
};

export const refresh = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({ message: 'No refresh token' });
    }
    
    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    const accessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    
    res.json({ user: user.toPublicJSON(), accessToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

export const guestLogin = async (req, res) => {
  try {
    const guestName = `Guest_${Date.now().toString(36)}`;
    const user = await User.create({
      name: guestName,
      email: `${guestName.toLowerCase()}@guest.geoconnect`,
      isGuest: true,
    });
    
    const accessToken = generateAccessToken(user._id);
    res.status(201).json({ user: user.toPublicJSON(), accessToken });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const oauthCallback = async (req, res) => {
  try {
    const user = req.user;
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/auth/callback?token=${accessToken}`);
  } catch (error) {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/login?error=oauth_failed`);
  }
};
