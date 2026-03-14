import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ok, created, paginated, noContent, message } from './response.js';

function makeMockRes() {
  const res = {
    json: vi.fn(),
    send: vi.fn(),
    status(code) {
      this._status = code;
      return this;
    },
  };
  return res;
}

describe('response helpers', () => {
  let res;

  beforeEach(() => {
    res = makeMockRes();
  });

  // --- ok() ---
  describe('ok()', () => {
    it('sets status 200 and returns { success: true, data }', () => {
      const data = { id: 1, name: 'Alice' };
      ok(res, data);

      expect(res._status).toBe(200);
      expect(res.json).toHaveBeenCalledOnce();
      expect(res.json).toHaveBeenCalledWith({ success: true, data });
    });

    it('works with null data', () => {
      ok(res, null);

      expect(res._status).toBe(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: null });
    });

    it('works with array data', () => {
      const data = [1, 2, 3];
      ok(res, data);

      expect(res._status).toBe(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data });
    });
  });

  // --- created() ---
  describe('created()', () => {
    it('sets status 201 and returns { success: true, data }', () => {
      const data = { id: 42 };
      created(res, data);

      expect(res._status).toBe(201);
      expect(res.json).toHaveBeenCalledOnce();
      expect(res.json).toHaveBeenCalledWith({ success: true, data });
    });
  });

  // --- paginated() ---
  describe('paginated()', () => {
    it('computes pages correctly when total is not evenly divisible (25 / 10 = 3)', () => {
      paginated(res, [], { page: 1, limit: 10, total: 25 });

      expect(res._status).toBe(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        meta: { page: 1, limit: 10, total: 25, pages: 3 },
      });
    });

    it('computes pages correctly with exact division (20 / 10 = 2)', () => {
      paginated(res, [], { page: 2, limit: 10, total: 20 });

      expect(res._status).toBe(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        meta: { page: 2, limit: 10, total: 20, pages: 2 },
      });
    });

    it('computes pages correctly when all results fit in one page (5 / 10 = 1)', () => {
      paginated(res, [], { page: 1, limit: 10, total: 5 });

      expect(res._status).toBe(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        meta: { page: 1, limit: 10, total: 5, pages: 1 },
      });
    });
  });

  // --- noContent() ---
  describe('noContent()', () => {
    it('sets status 204 and calls send() — not json()', () => {
      noContent(res);

      expect(res._status).toBe(204);
      expect(res.send).toHaveBeenCalledOnce();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  // --- message() ---
  describe('message()', () => {
    it('sets status 200 and returns { success: true, message }', () => {
      message(res, 'Operation successful');

      expect(res._status).toBe(200);
      expect(res.json).toHaveBeenCalledOnce();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Operation successful',
      });
    });
  });
});
