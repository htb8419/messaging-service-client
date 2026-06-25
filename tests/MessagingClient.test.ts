import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@stomp/stompjs', () => ({
  Client: vi.fn(() => ({
    activate: vi.fn(), deactivate: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    publish: vi.fn(), onConnect: undefined, onDisconnect: undefined,
    onStompError: undefined, onWebSocketClose: undefined, connected: false,
  })),
}))

import { MessagingClient } from '../src/MessagingClient'
import { EventType } from '../src/events/EventType'

const token = btoa(JSON.stringify({ alg: 'HS256' })) + '.' + btoa(JSON.stringify({ user_name: 'u1' })) + '.sig'

describe('MessagingClient', () => {
  let client: MessagingClient

  beforeEach(() => {
    client = new MessagingClient({
      serverUrl: 'https://api.example.com',
      accessToken: token,
      roomId: 'room-1',
    })
  })

  it('exposes EventType statically', () => {
    expect(MessagingClient.EventType.Message).toBe('message')
  })

  it('registers and receives events', () => {
    const handler = vi.fn()
    client.on(EventType.ConnectionChange, handler)
    client['events'].emit(EventType.ConnectionChange, {
      state: 'CONNECTED' as any,
      connected: true,
    })
    expect(handler).toHaveBeenCalledWith({ state: 'CONNECTED', connected: true })
  })

  it('removes event handlers via off()', () => {
    const handler = vi.fn()
    client.on(EventType.ConnectionChange, handler)
    client.off(EventType.ConnectionChange, handler)
    client['events'].emit(EventType.ConnectionChange, {
      state: 'CONNECTED' as any,
      connected: true,
    })
    expect(handler).not.toHaveBeenCalled()
  })

  it('connect() delegates to StompConnection', () => {
    const connectSpy = vi.spyOn(client['connection'], 'connect')
    client.connect()
    expect(connectSpy).toHaveBeenCalled()
  })

  it('disconnect() ends call and disconnects', async () => {
    const endCallSpy = vi.spyOn(client['callService'], 'endCall')
    const disconnectSpy = vi.spyOn(client['connection'], 'disconnect')
    await client.disconnect()
    expect(endCallSpy).toHaveBeenCalledWith(false)
    expect(disconnectSpy).toHaveBeenCalled()
  })

  it('sendMessage delegates to MessageService', async () => {
    const spy = vi.spyOn(client['messageService'], 'sendMessage')
    await client.sendMessage('hello')
    expect(spy).toHaveBeenCalledWith('hello', undefined)
  })

  it('makeCall delegates to CallService', async () => {
    const spy = vi.spyOn(client['callService'], 'makeCall').mockResolvedValue(undefined)
    await client.makeCall()
    expect(spy).toHaveBeenCalled()
  })

  it('getFileUrl delegates to FileService', () => {
    const url = client.getFileUrl('file-1')
    expect(url).toBe('https://api.example.com/fs/file/file-1')
  })
})
