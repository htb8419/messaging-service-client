import { describe, it, expect } from 'vitest'
import { Auth } from '../../src/core/Auth'

// A valid JWT with payload: { "user_name": "user1" }
const tokenParts = {
  header: btoa(JSON.stringify({ alg: 'HS256' })),
  payload: btoa(JSON.stringify({ user_name: 'user1' })),
  signature: 'fake-sig',
}
const validToken = `${tokenParts.header}.${tokenParts.payload}.${tokenParts.signature}`

describe('Auth', () => {
  it('extracts username from JWT', () => {
    const auth = new Auth(validToken)
    expect(auth.username).toBe('user1')
  })

  it('uses username as sessionId', () => {
    const auth = new Auth(validToken)
    expect(auth.sessionId).toBe('user1')
  })

  it('stores accessToken', () => {
    const auth = new Auth(validToken)
    expect(auth.accessToken).toBe(validToken)
  })

  it('throws on invalid token format', () => {
    expect(() => new Auth('not-a-jwt')).toThrow()
  })

  it('throws when user_name is missing from payload', () => {
    const badPayload = btoa(JSON.stringify({ sub: 'x' }))
    const badToken = `${tokenParts.header}.${badPayload}.${tokenParts.signature}`
    expect(() => new Auth(badToken)).toThrow()
  })
})
