import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { HttpClient } from '../../src/core/HttpClient'

describe('HttpClient', () => {
  let http: HttpClient
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    http = new HttpClient('https://api.example.com', 'token-abc')
  })

  it('GET request includes auth header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ payload: { id: 1 } }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await http.get<{ id: number }>('/test')
    expect(result).toEqual({ id: 1 })
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/test',
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: 'bearer token-abc' },
      })
    )
  })

  it('POST request sends JSON body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ payload: 'ok' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await http.post('/submit', { key: 'value' })
    const call = mockFetch.mock.calls[0]
    const body = JSON.parse(call[1].body)
    expect(body).toEqual({ key: 'value' })
  })

  it('aborts after 5 second timeout', async () => {
    vi.useFakeTimers()
    const mockFetch = vi.fn().mockImplementation((_url, opts) => {
      return new Promise((_, reject) => {
        opts.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      })
    })
    vi.stubGlobal('fetch', mockFetch)

    const promise = http.get('/test')
    vi.advanceTimersByTime(5000)
    await expect(promise).rejects.toThrow()

    vi.useRealTimers()
  })

  it('throws on non-200 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }))

    await expect(http.get('/test')).rejects.toThrow('Access Denied')
  })

  it('extracts payload from wrapped response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ payload: { data: 'result' } }),
    }))

    const result = await http.get('/test')
    expect(result).toEqual({ data: 'result' })
  })

  it('returns raw response when no payload key', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 'direct' }),
    }))

    const result = await http.get('/test')
    expect(result).toEqual({ id: 'direct' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })
})
