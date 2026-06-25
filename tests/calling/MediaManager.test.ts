import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MediaManager } from '../../src/calling/MediaManager'

describe('MediaManager', () => {
  const constraints: MediaStreamConstraints = {
    video: { width: { min: 384, ideal: 640 } },
    audio: { echoCancellation: true },
  }

  beforeEach(() => {
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [
            { kind: 'video', stop: vi.fn(), enabled: true },
            { kind: 'audio', stop: vi.fn(), enabled: true },
          ],
        }),
        enumerateDevices: vi.fn().mockResolvedValue([
          { kind: 'videoinput', deviceId: 'v1' },
          { kind: 'audioinput', deviceId: 'a1' },
        ]),
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('getUserMedia returns stream', async () => {
    const stream = await MediaManager.getUserMedia(constraints)
    expect(stream).toBeDefined()
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(constraints)
  })

  it('existsConnectedDevices returns true when devices present', async () => {
    const exists = await MediaManager.existsConnectedDevices('videoinput')
    expect(exists).toBe(true)
  })

  it('existsConnectedDevices returns false when no devices', async () => {
    vi.stubGlobal('navigator', {
      mediaDevices: {
        enumerateDevices: vi.fn().mockResolvedValue([]),
        getUserMedia: vi.fn(),
      },
    })
    const exists = await MediaManager.existsConnectedDevices('videoinput')
    expect(exists).toBe(false)
  })

  it('toggleTrack enables/disables track by kind', () => {
    const videoTrack = { kind: 'video', enabled: true }
    const audioTrack = { kind: 'audio', enabled: true }
    const stream = { getTracks: () => [videoTrack, audioTrack] } as unknown as MediaStream
    MediaManager.toggleTrack(stream, 'video', false)
    expect(videoTrack.enabled).toBe(false)
    expect(audioTrack.enabled).toBe(true)
  })

  it('getConnectedDevices filters by kind', async () => {
    const devices = await MediaManager.getConnectedDevices('audioinput')
    expect(devices).toHaveLength(1)
    expect(devices[0]!.deviceId).toBe('a1')
  })

  it('getAvailableConstraints removes video/audio when no devices', async () => {
    vi.stubGlobal('navigator', {
      mediaDevices: {
        enumerateDevices: vi.fn().mockResolvedValue([]),
        getUserMedia: vi.fn(),
      },
    })
    const result = await MediaManager.getAvailableConstraints(constraints)
    expect(result.video).toBe(false)
    expect(result.audio).toBe(false)
  })

  it('getAvailableConstraints keeps constraints when devices present', async () => {
    const result = await MediaManager.getAvailableConstraints(constraints)
    expect(result.video).toBeTruthy()
    expect(result.audio).toBeTruthy()
  })

  it('stopAllTracks stops all tracks', () => {
    const s1 = vi.fn(); const s2 = vi.fn()
    const stream = { getTracks: () => [{ stop: s1 }, { stop: s2 }] } as unknown as MediaStream
    MediaManager.stopAllTracks(stream)
    expect(s1).toHaveBeenCalled()
    expect(s2).toHaveBeenCalled()
  })

  it('stopAllTracks handles null gracefully', () => {
    expect(() => MediaManager.stopAllTracks(null)).not.toThrow()
  })
})
