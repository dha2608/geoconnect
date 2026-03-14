import { describe, it, expect, vi } from 'vitest';
import { asyncHandler } from './asyncHandler.js';

function makeMocks() {
  return {
    req: {},
    res: {},
    next: vi.fn(),
  };
}

describe('asyncHandler', () => {
  it('returns a function (middleware signature)', () => {
    const middleware = asyncHandler(vi.fn());
    expect(typeof middleware).toBe('function');
    expect(middleware.length).toBe(3);
  });

  it('calls the wrapped function with req, res, next', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const { req, res, next } = makeMocks();

    await asyncHandler(fn)(req, res, next);

    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith(req, res, next);
  });

  it('does not call next when the function resolves successfully', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const { req, res, next } = makeMocks();

    await asyncHandler(fn)(req, res, next);

    expect(next).not.toHaveBeenCalled();
  });

  it('calls next with the error when the function rejects', async () => {
    const error = new Error('async failure');
    const fn = vi.fn().mockRejectedValue(error);
    const { req, res, next } = makeMocks();

    await asyncHandler(fn)(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(error);
  });

  it('calls next with the error when the function throws synchronously inside async', async () => {
    const error = new Error('sync throw inside async');
    const fn = vi.fn(async () => {
      throw error;
    });
    const { req, res, next } = makeMocks();

    await asyncHandler(fn)(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(error);
  });
});
