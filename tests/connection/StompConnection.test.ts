import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StompConnection } from '../../src/connection/StompConnection'
import { Config, type MessagingOptions } from '../../src/core/Config'
import { Auth } from '../../src/core/Auth'
import { TypedEmitter } from '../../src/core/TypedEmitter'
import { ConnectionState } from '../../src/enums/ConnectionState'
import { EventType } from '../../src/events/EventType'
import type { MessagingEventMap } from '../../src/events/types'

// Mock @stomp/stompjs
vi.mock('@stomp/stompjs', () => ({
  Client: vi.fn().mockImplementation(() => ({
    activate: vi.fn(),
    deactivate: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    publish: vi.fn(),
    onConnect: undefined as unknown,
    onDisconnect: undefined as unknown,
    onStompError: undefined as unknown,
    onWebSocketClose: undefined as unknown,
    connected: false,
  })),
}))

const mockOptions: MessagingOptions = {
  serverUrl: 'https://chat.example.com',
  accessToken: btoa(JSON.stringify({ alg: 'HS256' })) + '.' + btoa(JSON.stringify({ user_name: 'user1' })) + '.sig',
  roomId: 'room-1',
}

describe('StompConnection', () => {
  let connection: StompConnection
  let config: Config
  let auth: Auth
  let events: TypedEmitter<MessagingEventMap>

  beforeEach(() => {
    vi.clearAllMocks()
    config = new Config(mockOptions)
    auth = new Auth(mockOptions.accessToken)
    events = new TypedEmitter<MessagingEventMap>()
    connection = new StompConnection(config, auth, events)
  })

  it('starts in IDLE state', () => {
    expect(connection.state).toBe(ConnectionState.IDLE)
  })

  it('connect() activates the STOMP client', () => {
    const activateSpy = vi.spyOn(connection['stompClient'], 'activate')
    connection.connect()
    expect(activateSpy).toHaveBeenCalled()
  })

  it('disconnect() deactivates the STOMP client', async () => {
    const deactivateSpy = vi.spyOn(connection['stompClient'], 'deactivate')
    await connection.disconnect()
    expect(deactivateSpy).toHaveBeenCalled()
    expect(connection.state).toBe(ConnectionState.DISCONNECTED)
  })

  it('emits connection:change on connect callback', () => {
    const handler = vi.fn()
    events.on(EventType.ConnectionChange, handler)
    connection.connect()
    // Simulate STOMP onConnect callback
    const onConnect = connection['stompClient'].onConnect as unknown as () => void
    onConnect()
    expect(handler).toHaveBeenCalledWith({
      state: ConnectionState.CONNECTED,
      connected: true,
    })
  })

  it('send() publishes to STOMP destination', () => {
    const publishSpy = vi.spyOn(connection['stompClient'], 'publish')
    connection['stompClient'].connected = true
    connection.send('/app/im', { 'content-type': 'application/json' }, JSON.stringify({ text: 'hi' }))
    expect(publishSpy).toHaveBeenCalledWith({
      destination: '/app/im',
      headers: expect.objectContaining({ 'content-type': 'application/json' }),
      body: JSON.stringify({ text: 'hi' }),
    })
  })
})
