import { describe, it, expect } from 'vitest'
import { Config, type MessagingOptions } from '../../src/core/Config'

const baseOptions: MessagingOptions = {
  serverUrl: 'https://chat.example.com',
  accessToken: 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX25hbWUiOiJ1c2VyMSJ9.xxx',
  roomId: 'room-123',
}

describe('Config', () => {
  it('sets serverUrl and fileServiceUrl from serverUrl', () => {
    const config = new Config(baseOptions)
    expect(config.serverUrl).toBe('https://chat.example.com')
    expect(config.fileServiceUrl).toBe('https://chat.example.com/fs/file')
  })

  it('converts https:// serverUrl to wss:// socketUrl', () => {
    const config = new Config(baseOptions)
    expect(config.socketUrl).toBe('wss://chat.example.com/ws-adapter')
  })

  it('converts http:// serverUrl to ws:// socketUrl', () => {
    const config = new Config({ ...baseOptions, serverUrl: 'http://localhost:8080' })
    expect(config.socketUrl).toBe('ws://localhost:8080/ws-adapter')
  })

  it('stores roomId', () => {
    const config = new Config(baseOptions)
    expect(config.roomId).toBe('room-123')
  })

  it('applies default heartbeat values when not provided', () => {
    const config = new Config(baseOptions)
    expect(config.heartbeatIncoming).toBe(20000)
    expect(config.heartbeatOutgoing).toBe(20000)
  })

  it('uses provided heartbeat overrides', () => {
    const config = new Config({ ...baseOptions, heartbeatIncoming: 5000, heartbeatOutgoing: 5000 })
    expect(config.heartbeatIncoming).toBe(5000)
    expect(config.heartbeatOutgoing).toBe(5000)
  })

  it('provides default RTC config with iceServers', () => {
    const config = new Config(baseOptions)
    expect(config.rtcConfig.iceServers).toBeDefined()
    expect(config.rtcConfig.iceServers!.length).toBeGreaterThan(0)
  })

  it('merges provided rtcConfig with defaults', () => {
    const config = new Config({
      ...baseOptions,
      rtcConfig: { iceServers: [{ urls: 'stun:custom:3478' }] },
    })
    expect(config.rtcConfig.iceServers).toEqual([{ urls: 'stun:custom:3478' }])
  })

  it('provides default media constraints', () => {
    const config = new Config(baseOptions)
    expect(config.mediaConstraints.video).toBeDefined()
    expect(config.mediaConstraints.audio).toBeDefined()
  })

  it('throws when serverUrl is missing', () => {
    expect(() => new Config({ ...baseOptions, serverUrl: '' })).toThrow()
  })
})
