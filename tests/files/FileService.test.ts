import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FileService } from '../../src/files/FileService'
import { Config } from '../../src/core/Config'
import { Auth } from '../../src/core/Auth'

const token = btoa(JSON.stringify({ alg: 'HS256' })) + '.' + btoa(JSON.stringify({ user_name: 'u1' })) + '.sig'

describe('FileService', () => {
  let service: FileService

  beforeEach(() => {
    const config = new Config({ serverUrl: 'https://api.example.com', accessToken: token, roomId: 'r1' })
    const auth = new Auth(token)
    service = new FileService(config, auth)
  })

  it('getFileUrl returns correct URL', () => {
    const url = service.getFileUrl('file-123')
    expect(url).toBe('https://api.example.com/fs/file/file-123')
  })

  it('getFileUrl throws on empty fileId', () => {
    expect(() => service.getFileUrl('')).toThrow('fileId is required')
  })

  it('upload sends FormData with auth header', async () => {
    const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' })
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ result: { fileId: 'f1' } }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await service.upload(mockFile)
    expect(result).toEqual({ fileId: 'f1', name: 'test.txt', mimeType: 'text/plain', size: 7 })
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/fs/file',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: `bearer ${token}` },
      })
    )
  })

  it('upload falls back to text/plain for empty mimeType', async () => {
    const mockFile = new File(['x'], 'noext', { type: '' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: { fileId: 'f2' } }),
    }))

    const result = await service.upload(mockFile)
    expect(result.mimeType).toBe('text/plain')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })
})
