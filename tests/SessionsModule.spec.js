import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'

/**
 * SessionsModule extends AbstractModule and requires express-session, MongoDB, etc.
 * We test the storeAuthHeader and clearSession methods using extracted logic.
 */

describe('SessionsModule', () => {
  describe('#storeAuthHeader()', () => {
    /* inline helper: extracted storeAuthHeader logic */
    function storeAuthHeader (req, res, next) {
      const token = req?.session?.token
      if (token && !req.headers.Authorization) {
        req.headers.Authorization = `Bearer ${token}`
      }
      next()
    }

    it('should set Authorization header when session token exists and no header present', () => {
      const req = {
        session: { token: 'abc123' },
        headers: {}
      }
      const next = mock.fn()
      storeAuthHeader(req, {}, next)
      assert.equal(req.headers.Authorization, 'Bearer abc123')
      assert.equal(next.mock.calls.length, 1)
    })

    it('should not override existing Authorization header', () => {
      const req = {
        session: { token: 'abc123' },
        headers: { Authorization: 'Bearer existing' }
      }
      const next = mock.fn()
      storeAuthHeader(req, {}, next)
      assert.equal(req.headers.Authorization, 'Bearer existing')
    })

    it('should call next when no session token', () => {
      const req = {
        session: {},
        headers: {}
      }
      const next = mock.fn()
      storeAuthHeader(req, {}, next)
      assert.equal(req.headers.Authorization, undefined)
      assert.equal(next.mock.calls.length, 1)
    })

    it('should call next when session is undefined', () => {
      const req = { headers: {} }
      const next = mock.fn()
      storeAuthHeader(req, {}, next)
      assert.equal(next.mock.calls.length, 1)
    })

    it('should call next when req is empty', () => {
      const next = mock.fn()
      storeAuthHeader({}, {}, next)
      assert.equal(next.mock.calls.length, 1)
    })
  })

  describe('#clearSession()', () => {
    /* inline helper: extracted clearSession logic */
    async function clearSession (req) {
      if (!req.session) {
        return
      }
      return new Promise((resolve, reject) => {
        req.session.destroy(e => {
          if (e) return reject(new Error('DESTROY_SESSION_FAIL'))
          resolve()
        })
      })
    }

    it('should return early when no session exists', async () => {
      const result = await clearSession({})
      assert.equal(result, undefined)
    })

    it('should resolve when session.destroy succeeds', async () => {
      const req = {
        session: {
          destroy: (cb) => cb(null)
        }
      }
      await clearSession(req)
    })

    it('should reject when session.destroy fails', async () => {
      const req = {
        session: {
          destroy: (cb) => cb(new Error('fail'))
        }
      }
      await assert.rejects(
        () => clearSession(req),
        { message: 'DESTROY_SESSION_FAIL' }
      )
    })
  })
})
