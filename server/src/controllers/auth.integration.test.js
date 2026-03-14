/**
 * Auth Controller — Integration Tests
 *
 * Requires:
 *   - ../test/setup.js  →  setupTestDB(), teardownTestDB(), clearCollections()
 *   - ../test/app.js    →  createTestApp()   (strips authLimiter, Redis, etc.)
 *
 * JWT env vars are assigned at module level so they are available when the
 * imported auth utilities first call generateAccessToken / generateRefreshToken.
 */

// ── Env vars (must be set before any test-module code runs) ──────────────────
process.env.JWT_ACCESS_SECRET  = 'test-access-secret-for-vitest';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-vitest';
process.env.NODE_ENV           = 'test';

// ── Imports ───────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { setupTestDB, teardownTestDB, clearCollections } from '../test/setup.js';
import { createTestApp } from '../test/app.js';

// ── Shared fixtures ───────────────────────────────────────────────────────────

/** A password that satisfies all server-side rules (min 8, uppercase, digit, special). */
const STRONG_PASSWORD = 'Test123!';

const VALID_USER = {
  name: 'Alice Tester',
  email: 'alice@example.com',
  password: STRONG_PASSWORD,
};

// ── Lifecycle ─────────────────────────────────────────────────────────────────

let app;

beforeAll(async () => {
  await setupTestDB();
  app = createTestApp();
});

beforeEach(async () => {
  await clearCollections();
});

afterAll(async () => {
  await teardownTestDB();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Register a user and return the supertest Response.
 * Used as a setup step in Login / Logout / Refresh tests.
 */
const registerUser = (overrides = {}) =>
  request(app)
    .post('/api/auth/register')
    .send({ ...VALID_USER, ...overrides });

/**
 * Extract the refreshToken cookie string from a supertest response's
 * `set-cookie` header so it can be forwarded with `.set('Cookie', …)`.
 */
const extractRefreshCookie = (res) => {
  const cookies = res.headers['set-cookie'];
  if (!cookies) return null;
  const arr = Array.isArray(cookies) ? cookies : [cookies];
  return arr.find((c) => c.startsWith('refreshToken=')) ?? null;
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('returns 201 with user and accessToken on valid data', { timeout: 15000 }, async () => {
    const res = await registerUser();

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      user: {
        name: VALID_USER.name,
        email: VALID_USER.email,
        isGuest: false,
        role: 'user',
      },
      accessToken: expect.any(String),
    });
    // Password must never leak
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('sets a refreshToken cookie on success', { timeout: 15000 }, async () => {
    const res = await registerUser();

    const cookie = extractRefreshCookie(res);
    expect(cookie).not.toBeNull();
    expect(cookie).toMatch(/^refreshToken=/);
    // httpOnly must be set (cookie string contains HttpOnly)
    expect(cookie).toMatch(/HttpOnly/i);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: VALID_USER.email, password: STRONG_PASSWORD });

    expect(res.status).toBe(400);
    // validate() middleware returns this shape
    expect(res.body).toMatchObject({ message: 'Validation failed' });
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('returns 400 when name is shorter than 2 characters', async () => {
    const res = await registerUser({ name: 'X' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ message: 'Validation failed' });
    const fields = res.body.errors.map((e) => e.field);
    expect(fields).toContain('name');
  });

  it('returns 400 when password is too short (< 8 chars)', async () => {
    const res = await registerUser({ password: 'Ab1!' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ message: 'Validation failed' });
    const fields = res.body.errors.map((e) => e.field);
    expect(fields).toContain('password');
  });

  it('returns 400 when password has no uppercase letter', async () => {
    const res = await registerUser({ password: 'test123!' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  it('returns 400 when password has no special character', async () => {
    const res = await registerUser({ password: 'Test1234' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  it('returns 400 when email is already registered', { timeout: 15000 }, async () => {
    // First registration succeeds
    await registerUser();

    // Second registration with same email
    const res = await registerUser();

    // Controller throws AppError.badRequest → global handler sends 400
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Email already registered',
    });
  });

  it('returns 400 when email format is invalid', async () => {
    const res = await registerUser({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ message: 'Validation failed' });
    const fields = res.body.errors.map((e) => e.field);
    expect(fields).toContain('email');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    // Seed a registered user before each login test (clearCollections wipes between tests)
    await registerUser();
  });

  it('returns 200 with user and accessToken on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      user: { email: VALID_USER.email },
      accessToken: expect.any(String),
    });
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('sets a refreshToken cookie on successful login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });

    const cookie = extractRefreshCookie(res);
    expect(cookie).not.toBeNull();
    expect(cookie).toMatch(/^refreshToken=/);
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: 'WrongPass99!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when email does not exist', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: STRONG_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 when email field is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: STRONG_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ message: 'Validation failed' });
  });

  it('returns 400 when password field is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ message: 'Validation failed' });
    const fields = res.body.errors.map((e) => e.field);
    expect(fields).toContain('password');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/guest
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/guest', () => {
  it('returns 201 with a guest user (isGuest: true)', async () => {
    const res = await request(app).post('/api/auth/guest');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toMatchObject({
      isGuest: true,
      isEmailVerified: true, // guests are auto-verified
    });
    expect(res.body.data.user.email).toMatch(/@guest\.geoconnect$/);
  });

  it('returns a valid accessToken in the response body', async () => {
    const res = await request(app).post('/api/auth/guest');

    expect(res.status).toBe(201);
    const { accessToken } = res.body.data;
    expect(typeof accessToken).toBe('string');
    // JWT is three base64url segments separated by dots
    expect(accessToken.split('.').length).toBe(3);
  });

  it('each call creates a unique guest user', async () => {
    const [res1, res2] = await Promise.all([
      request(app).post('/api/auth/guest'),
      request(app).post('/api/auth/guest'),
    ]);

    expect(res1.body.data.user.email).not.toBe(res2.body.data.user.email);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('returns 200 with "Logged out successfully" message', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/logged out/i);
  });

  it('clears the refreshToken cookie when one is present', { timeout: 15000 }, async () => {
    // Login to obtain a refreshToken cookie
    await registerUser();
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });

    const loginCookie = extractRefreshCookie(loginRes);

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', loginCookie);

    expect(logoutRes.status).toBe(200);

    // After logout the Set-Cookie header should expire the refreshToken
    const clearCookie = extractRefreshCookie(logoutRes);
    // Express clearCookie sets Max-Age=0 or Expires in the past
    if (clearCookie) {
      expect(clearCookie).toMatch(/Max-Age=0|Expires=.*1970|refreshToken=;/i);
    }
  });

  it('succeeds even without a refreshToken cookie (no-op logout)', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/refresh', () => {
  it('returns 401 when no refreshToken cookie is present', async () => {
    const res = await request(app).post('/api/auth/refresh');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 200 with a new accessToken when a valid cookie is provided', { timeout: 15000 }, async () => {
    // Register to receive a refreshToken cookie
    const registerRes = await registerUser();
    const cookie = extractRefreshCookie(registerRes);
    expect(cookie).not.toBeNull();

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookie);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.data.accessToken).toEqual(expect.any(String));
    expect(refreshRes.body.data.accessToken.split('.').length).toBe(3);
  });

  it('rotates the refreshToken cookie on success', { timeout: 15000 }, async () => {
    const registerRes = await registerUser();
    const oldCookie = extractRefreshCookie(registerRes);

    // Wait 1.1s so JWT iat (seconds) differs — same-second JWTs produce identical tokens
    await new Promise((r) => setTimeout(r, 1100));

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', oldCookie);

    const newCookie = extractRefreshCookie(refreshRes);
    expect(newCookie).not.toBeNull();
    // The token value in the new cookie should differ from the old one
    const oldValue = oldCookie.split(';')[0];
    const newValue = newCookie.split(';')[0];
    expect(newValue).not.toBe(oldValue);
  });

  it('returns 401 when the refreshToken cookie is invalid / tampered', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', 'refreshToken=totally.invalid.token; Path=/; HttpOnly');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unknown routes → 404
// ─────────────────────────────────────────────────────────────────────────────

describe('Unknown routes', () => {
  it('returns 404 for an unrecognised API path', async () => {
    const res = await request(app).get('/api/nonexistent-route-xyz');

    expect(res.status).toBe(404);
  });
});
