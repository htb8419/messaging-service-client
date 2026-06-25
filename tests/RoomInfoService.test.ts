import { describe, it, expect, vi, afterEach } from 'vitest'
import { RoomInfoService } from '../src/RoomInfoService'
import { Config } from '../src/core/Config'

const token = btoa(JSON.stringify({ alg: 'HS256' })) + '.' + btoa(JSON.stringify({ user_name: 'u1' })) + '.sig'
const config = new Config({ serverUrl: 'https://api.example.com', accessToken: token, roomId: 'r1' })

describe('RoomInfoService', () => {
  const service = new RoomInfoService()

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('getRoomInfo returns result when present', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: { currentParticipant: { token: 't1' }, name: 'Room1' } }),
    }))
    const info = await service.getRoomInfo('code123', config)
    expect(info.currentParticipant.token).toBe('t1')
  })

  it('getRoomInfo uses payload when no result key', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ payload: { currentParticipant: { token: 't2' } } }),
    }))
    const info = await service.getRoomInfo('code456', config)
    expect(info.currentParticipant.token).toBe('t2')
  })

  it('getRoomInfo throws INVALID_ROOM_CODE on NO_LINK_FOUND', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messages: [{ code: 'NO_LINK_FOUND' }] }),
    }))
    await expect(service.getRoomInfo('badcode', config)).rejects.toThrow('INVALID_ROOM_CODE')
  })
})
