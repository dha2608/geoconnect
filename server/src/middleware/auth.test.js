import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock all external dependencies BEFORE importing the module under test.
// vi.mock() calls are hoisted by vitest, so order relative to imports is fine.
// ---------------------------------------------------------------------------

vi.mock('jsonwebtoken', () => ({
  default: { verify: vi.fn() },
}));

vi.mock('../models/User.js', () => ({
  default: { findById: vi.fn() },
}));

vi.mock('../utils/tokenBlacklist.js', () => ({
  isTokenBlacklisted: vi.fn(),
}));

// Import module under test AFTER vi.mock() declarations.
import { authenticate, optionalAuth } from './auth.js';

// Import mocked references so we can control their behaviour in each test.
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { isTokenBlacklisted } from '../utils/tokenBlacklist.js';

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const VALID_TOKEN = 'valid.jwt.token';
const FAKE_USER   = { _id: 'user123', name: 'Test User', email: 'test@example.com' };
const DECODED     = { userId: 'user123' };

/**
 * Build fresh req / res / next mocks for each test.
 * @param {string|undefined} authorization - Value for the Authorization header.
 */
function makeMocks(authorization) {
  const json = vi.fn();
  const res = {
    status: vi.fn().mockReturnThis(), // enables res.status(401).json(...)
    json,
  };
  const req  = { headers: { authorization } };
  const next = vi.fn();
  return { req, res, next };
}

// ---------------------------------------------------------------------------
// Global setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  process.env.JWT_ACCESS_SECRET = 'test-secret';

  // Happy-path defaults – individual tests override as needed.
  isTokenBlacklisted.mockResolvedValue(false);
  jwt.verify.mockReturnValue(DECODED);
  User.findById.mockResolvedValue(FAKE_USER);
});

afterEach(() => {
  delete process.env.JWT_ACCESS_SECRET;
});

// ---------------------------------------------------------------------------
// authenticate
// ---------------------------------------------------------------------------

describe('authenticate', () => {
  it('returns 401 "Access token required" when no Authorization header is present', async () => {
    const { req, res, next } = makeMocks(undefined);

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Access token required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 TOKEN_REVOKED when the token is blacklisted', async () => {
    isTokenBlacklisted.mockResolvedValue(true);
    const { req, res, next } = makeMocks(`Bearer ${VALID_TOKEN}`);

    await authenticate(req, res, next);

    expect(isTokenBlacklisted).toHaveBeenCalledWith(VALID_TOKEN);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Token revoked', code: 'TOKEN_REVOKED' });
    expect(next).not.toHaveBeenCalled();
  });

  it('sets req.user, req.token and calls next() for a valid token with an existing user', async () => {
    const { req, res, next } = makeMocks(`Bearer ${VALID_TOKEN}`);

    await authenticate(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith(VALID_TOKEN, 'test-secret');
    expect(User.findById).toHaveBeenCalledWith(DECODED.userId);
    expect(req.user).toBe(FAKE_USER);
    expect(req.token).toBe(VALID_TOKEN);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 "User not found" when the decoded userId has no matching user', async () => {
    User.findById.mockResolvedValue(null);
    const { req, res, next } = makeMocks(`Bearer ${VALID_TOKEN}`);

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 TOKEN_EXPIRED when jwt.verify throws TokenExpiredError', async () => {
    const expiredError = Object.assign(new Error('jwt expired'), { name: 'TokenExpiredError' });
    jwt.verify.mockImplementation(() => { throw expiredError; });
    const { req, res, next } = makeMocks(`Bearer ${VALID_TOKEN}`);

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 "Invalid token" for a malformed / unrecognised token', async () => {
    const jwtError = Object.assign(new Error('invalid signature'), { name: 'JsonWebTokenError' });
    jwt.verify.mockImplementation(() => { throw jwtError; });
    const { req, res, next } = makeMocks('Bearer malformed.token.here');

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// optionalAuth
// ---------------------------------------------------------------------------

describe('optionalAuth', () => {
  it('calls next() and leaves req.user undefined when no token is provided', async () => {
    const { req, res, next } = makeMocks(undefined);

    await optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toBeUndefined();
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it('sets req.user = null and calls next() when token is blacklisted', async () => {
    isTokenBlacklisted.mockResolvedValue(true);
    const { req, res, next } = makeMocks(`Bearer ${VALID_TOKEN}`);

    await optionalAuth(req, res, next);

    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalledOnce();
    // Should NOT attempt to verify a blacklisted token.
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it('sets req.user and calls next() for a valid token with an existing user', async () => {
    const { req, res, next } = makeMocks(`Bearer ${VALID_TOKEN}`);

    await optionalAuth(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith(VALID_TOKEN, 'test-secret');
    expect(req.user).toBe(FAKE_USER);
    expect(next).toHaveBeenCalledOnce();
  });

  it('sets req.user = null and calls next() when the decoded userId has no matching user', async () => {
    User.findById.mockResolvedValue(null);
    const { req, res, next } = makeMocks(`Bearer ${VALID_TOKEN}`);

    await optionalAuth(req, res, next);

    // findById returned null → req.user is null
    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalledOnce();
  });

  it('sets req.user = null, calls next() and logs console.warn for an invalid token (JsonWebTokenError)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const jwtError = Object.assign(new Error('invalid signature'), { name: 'JsonWebTokenError' });
    jwt.verify.mockImplementation(() => { throw jwtError; });
    const { req, res, next } = makeMocks('Bearer bad.token.value');

    await optionalAuth(req, res, next);

    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('JsonWebTokenError'));

    warnSpy.mockRestore();
  });

  it('sets req.user = null, calls next() and logs console.warn for an expired token (TokenExpiredError)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const expiredError = Object.assign(new Error('jwt expired'), { name: 'TokenExpiredError' });
    jwt.verify.mockImplementation(() => { throw expiredError; });
    const { req, res, next } = makeMocks(`Bearer ${VALID_TOKEN}`);

    await optionalAuth(req, res, next);

    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('TokenExpiredError'));

    warnSpy.mockRestore();
  });
});
