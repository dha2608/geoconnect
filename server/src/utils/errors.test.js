import { describe, it, expect } from 'vitest'
import { ERR, AppError } from './errors.js'

// ---------------------------------------------------------------------------
// ERR enum
// ---------------------------------------------------------------------------

describe('ERR enum', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(ERR)).toBe(true)
  })

  it('has exactly 16 keys', () => {
    const expected = [
      'BAD_REQUEST',
      'VALIDATION_FAILED',
      'DUPLICATE_ENTRY',
      'UNAUTHORIZED',
      'INVALID_TOKEN',
      'INVALID_CREDENTIALS',
      'FORBIDDEN',
      'ACCOUNT_DISABLED',
      'NOT_FOUND',
      'USER_NOT_FOUND',
      'PIN_NOT_FOUND',
      'POST_NOT_FOUND',
      'EVENT_NOT_FOUND',
      'COMMENT_NOT_FOUND',
      'CONFLICT',
      'RATE_LIMITED',
      'INTERNAL',
    ]
    expect(Object.keys(ERR)).toEqual(expect.arrayContaining(expected))
    expect(Object.keys(ERR)).toHaveLength(expected.length)
  })

  it('each entry has status, code, and defaultMsg properties', () => {
    for (const [key, entry] of Object.entries(ERR)) {
      expect(entry, `ERR.${key} should have status`).toHaveProperty('status')
      expect(entry, `ERR.${key} should have code`).toHaveProperty('code')
      expect(entry, `ERR.${key} should have defaultMsg`).toHaveProperty('defaultMsg')
    }
  })

  // Spot-checks ---------------------------------------------------------------

  it('ERR.BAD_REQUEST has status 400 and correct code', () => {
    expect(ERR.BAD_REQUEST.status).toBe(400)
    expect(ERR.BAD_REQUEST.code).toBe('BAD_REQUEST')
    expect(typeof ERR.BAD_REQUEST.defaultMsg).toBe('string')
    expect(ERR.BAD_REQUEST.defaultMsg.length).toBeGreaterThan(0)
  })

  it('ERR.VALIDATION_FAILED has status 400', () => {
    expect(ERR.VALIDATION_FAILED.status).toBe(400)
    expect(ERR.VALIDATION_FAILED.code).toBe('VALIDATION_FAILED')
  })

  it('ERR.DUPLICATE_ENTRY has status 400', () => {
    expect(ERR.DUPLICATE_ENTRY.status).toBe(400)
    expect(ERR.DUPLICATE_ENTRY.code).toBe('DUPLICATE_ENTRY')
  })

  it('ERR.UNAUTHORIZED has status 401', () => {
    expect(ERR.UNAUTHORIZED.status).toBe(401)
    expect(ERR.UNAUTHORIZED.code).toBe('UNAUTHORIZED')
  })

  it('ERR.INVALID_TOKEN has status 401', () => {
    expect(ERR.INVALID_TOKEN.status).toBe(401)
    expect(ERR.INVALID_TOKEN.code).toBe('INVALID_TOKEN')
  })

  it('ERR.INVALID_CREDENTIALS has status 401', () => {
    expect(ERR.INVALID_CREDENTIALS.status).toBe(401)
    expect(ERR.INVALID_CREDENTIALS.code).toBe('INVALID_CREDENTIALS')
  })

  it('ERR.FORBIDDEN has status 403', () => {
    expect(ERR.FORBIDDEN.status).toBe(403)
    expect(ERR.FORBIDDEN.code).toBe('FORBIDDEN')
  })

  it('ERR.ACCOUNT_DISABLED has status 403', () => {
    expect(ERR.ACCOUNT_DISABLED.status).toBe(403)
    expect(ERR.ACCOUNT_DISABLED.code).toBe('ACCOUNT_DISABLED')
  })

  it('ERR.NOT_FOUND has status 404', () => {
    expect(ERR.NOT_FOUND.status).toBe(404)
    expect(ERR.NOT_FOUND.code).toBe('NOT_FOUND')
  })

  it('ERR.USER_NOT_FOUND has status 404', () => {
    expect(ERR.USER_NOT_FOUND.status).toBe(404)
    expect(ERR.USER_NOT_FOUND.code).toBe('USER_NOT_FOUND')
  })

  it('ERR.PIN_NOT_FOUND has status 404', () => {
    expect(ERR.PIN_NOT_FOUND.status).toBe(404)
    expect(ERR.PIN_NOT_FOUND.code).toBe('PIN_NOT_FOUND')
  })

  it('ERR.POST_NOT_FOUND has status 404', () => {
    expect(ERR.POST_NOT_FOUND.status).toBe(404)
    expect(ERR.POST_NOT_FOUND.code).toBe('POST_NOT_FOUND')
  })

  it('ERR.EVENT_NOT_FOUND has status 404', () => {
    expect(ERR.EVENT_NOT_FOUND.status).toBe(404)
    expect(ERR.EVENT_NOT_FOUND.code).toBe('EVENT_NOT_FOUND')
  })

  it('ERR.COMMENT_NOT_FOUND has status 404', () => {
    expect(ERR.COMMENT_NOT_FOUND.status).toBe(404)
    expect(ERR.COMMENT_NOT_FOUND.code).toBe('COMMENT_NOT_FOUND')
  })

  it('ERR.CONFLICT has status 409', () => {
    expect(ERR.CONFLICT.status).toBe(409)
    expect(ERR.CONFLICT.code).toBe('CONFLICT')
  })

  it('ERR.RATE_LIMITED has status 429', () => {
    expect(ERR.RATE_LIMITED.status).toBe(429)
    expect(ERR.RATE_LIMITED.code).toBe('RATE_LIMITED')
  })

  it('ERR.INTERNAL has status 500', () => {
    expect(ERR.INTERNAL.status).toBe(500)
    expect(ERR.INTERNAL.code).toBe('INTERNAL_ERROR')
  })
})

// ---------------------------------------------------------------------------
// AppError — constructor
// ---------------------------------------------------------------------------

describe('AppError constructor', () => {
  it('uses errDef.defaultMsg when no message is provided', () => {
    const err = new AppError(ERR.NOT_FOUND)
    expect(err.message).toBe(ERR.NOT_FOUND.defaultMsg)
  })

  it('uses the provided custom message when supplied', () => {
    const customMsg = 'Custom error message'
    const err = new AppError(ERR.BAD_REQUEST, customMsg)
    expect(err.message).toBe(customMsg)
  })

  it('sets status from errDef', () => {
    const err = new AppError(ERR.FORBIDDEN)
    expect(err.status).toBe(403)
  })

  it('sets code from errDef', () => {
    const err = new AppError(ERR.UNAUTHORIZED)
    expect(err.code).toBe('UNAUTHORIZED')
  })

  it('sets details when provided', () => {
    const details = { field: 'email', issue: 'already taken' }
    const err = new AppError(ERR.DUPLICATE_ENTRY, undefined, details)
    expect(err.details).toEqual(details)
  })

  it('sets details to null when not provided', () => {
    const err = new AppError(ERR.NOT_FOUND)
    expect(err.details).toBeNull()
  })

  it('sets details to null when explicitly omitted', () => {
    const err = new AppError(ERR.INTERNAL, 'Something went wrong')
    expect(err.details).toBeNull()
  })

  it('is an instance of Error', () => {
    const err = new AppError(ERR.INTERNAL)
    expect(err).toBeInstanceOf(Error)
  })

  it('is an instance of AppError', () => {
    const err = new AppError(ERR.INTERNAL)
    expect(err).toBeInstanceOf(AppError)
  })

  it('has name === "AppError"', () => {
    const err = new AppError(ERR.BAD_REQUEST)
    expect(err.name).toBe('AppError')
  })
})

// ---------------------------------------------------------------------------
// AppError — toJSON()
// ---------------------------------------------------------------------------

describe('AppError toJSON()', () => {
  it('includes code and message', () => {
    const err = new AppError(ERR.NOT_FOUND, 'Resource missing')
    const json = err.toJSON()
    expect(json).toMatchObject({
      code: 'NOT_FOUND',
      message: 'Resource missing',
    })
  })

  it('excludes details key when details is null', () => {
    const err = new AppError(ERR.BAD_REQUEST)
    const json = err.toJSON()
    expect(json).not.toHaveProperty('details')
  })

  it('includes details when they were provided', () => {
    const details = { errors: ['field required'] }
    const err = new AppError(ERR.VALIDATION_FAILED, undefined, details)
    const json = err.toJSON()
    expect(json).toHaveProperty('details', details)
  })

  it('returns a plain object (not an AppError instance)', () => {
    const err = new AppError(ERR.CONFLICT)
    const json = err.toJSON()
    expect(json).not.toBeInstanceOf(AppError)
    expect(json).not.toBeInstanceOf(Error)
    expect(typeof json).toBe('object')
  })

  it('toJSON code matches the errDef code', () => {
    const err = new AppError(ERR.RATE_LIMITED)
    expect(err.toJSON().code).toBe('RATE_LIMITED')
  })
})

// ---------------------------------------------------------------------------
// AppError — static factories
// ---------------------------------------------------------------------------

describe('AppError static factories', () => {
  describe('badRequest()', () => {
    it('creates an error with status 400 and code BAD_REQUEST', () => {
      const err = AppError.badRequest('Bad input')
      expect(err.status).toBe(400)
      expect(err.code).toBe('BAD_REQUEST')
    })

    it('uses the provided message', () => {
      const err = AppError.badRequest('Invalid format')
      expect(err.message).toBe('Invalid format')
    })

    it('passes details through when provided', () => {
      const details = { field: 'age' }
      const err = AppError.badRequest('Bad input', details)
      expect(err.details).toEqual(details)
    })

    it('sets details to null when not provided', () => {
      const err = AppError.badRequest('Bad input')
      expect(err.details).toBeNull()
    })
  })

  describe('validationFailed()', () => {
    it('creates an error with status 400 and code VALIDATION_FAILED', () => {
      const err = AppError.validationFailed()
      expect(err.status).toBe(400)
      expect(err.code).toBe('VALIDATION_FAILED')
    })

    it('falls back to defaultMsg when no message is given', () => {
      const err = AppError.validationFailed()
      expect(err.message).toBe(ERR.VALIDATION_FAILED.defaultMsg)
    })

    it('passes details through when provided', () => {
      const details = [{ path: 'email', message: 'Invalid email' }]
      const err = AppError.validationFailed(details)
      expect(err.details).toEqual(details)
    })
  })

  describe('unauthorized()', () => {
    it('creates an error with status 401 and code UNAUTHORIZED', () => {
      const err = AppError.unauthorized()
      expect(err.status).toBe(401)
      expect(err.code).toBe('UNAUTHORIZED')
    })

    it('uses custom message when provided', () => {
      const err = AppError.unauthorized('Token expired')
      expect(err.message).toBe('Token expired')
    })

    it('falls back to defaultMsg when no message is given', () => {
      const err = AppError.unauthorized()
      expect(err.message).toBe(ERR.UNAUTHORIZED.defaultMsg)
    })
  })

  describe('forbidden()', () => {
    it('creates an error with status 403 and code FORBIDDEN', () => {
      const err = AppError.forbidden()
      expect(err.status).toBe(403)
      expect(err.code).toBe('FORBIDDEN')
    })

    it('uses custom message when provided', () => {
      const err = AppError.forbidden('Access denied')
      expect(err.message).toBe('Access denied')
    })

    it('falls back to defaultMsg when no message is given', () => {
      const err = AppError.forbidden()
      expect(err.message).toBe(ERR.FORBIDDEN.defaultMsg)
    })
  })

  describe('notFound()', () => {
    it('creates an error with status 404 and code NOT_FOUND', () => {
      const err = AppError.notFound()
      expect(err.status).toBe(404)
      expect(err.code).toBe('NOT_FOUND')
    })

    it('uses custom message when provided', () => {
      const err = AppError.notFound('User not found')
      expect(err.message).toBe('User not found')
    })

    it('falls back to defaultMsg when no message is given', () => {
      const err = AppError.notFound()
      expect(err.message).toBe(ERR.NOT_FOUND.defaultMsg)
    })
  })

  describe('conflict()', () => {
    it('creates an error with status 409 and code CONFLICT', () => {
      const err = AppError.conflict()
      expect(err.status).toBe(409)
      expect(err.code).toBe('CONFLICT')
    })

    it('uses custom message when provided', () => {
      const err = AppError.conflict('Email already exists')
      expect(err.message).toBe('Email already exists')
    })

    it('falls back to defaultMsg when no message is given', () => {
      const err = AppError.conflict()
      expect(err.message).toBe(ERR.CONFLICT.defaultMsg)
    })
  })

  describe('internal()', () => {
    it('creates an error with status 500 and code INTERNAL_ERROR', () => {
      const err = AppError.internal()
      expect(err.status).toBe(500)
      expect(err.code).toBe('INTERNAL_ERROR')
    })

    it('uses custom message when provided', () => {
      const err = AppError.internal('Database connection failed')
      expect(err.message).toBe('Database connection failed')
    })

    it('falls back to defaultMsg when no message is given', () => {
      const err = AppError.internal()
      expect(err.message).toBe(ERR.INTERNAL.defaultMsg)
    })
  })

  it('all factories return AppError instances', () => {
    const factories = [
      AppError.badRequest(),
      AppError.validationFailed(),
      AppError.unauthorized(),
      AppError.forbidden(),
      AppError.notFound(),
      AppError.conflict(),
      AppError.internal(),
    ]
    for (const err of factories) {
      expect(err).toBeInstanceOf(AppError)
      expect(err).toBeInstanceOf(Error)
      expect(err.name).toBe('AppError')
    }
  })
})
