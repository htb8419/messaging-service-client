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

  it('connect() does nothing when already CONNECTED', () => {
    connection.connect()
    connection['_state'] = ConnectionState.CONNECTED
    const activateSpy = vi.spyOn(connection['stompClient'], 'activate')
    connection.connect()
    expect(activateSpy).not.toHaveBeenCalled()
  })

  it('emits Error on STOMP error with message', () => {
    const handler = vi.fn()
    events.on(EventType.Error, handler)
    const onStompError = connection['stompClient'].onStompError as unknown as (frame: { headers: Record<string, string> }) => void
    onStompError({ headers: { message: 'Connection refused' } })
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      code: 'STOMP_ERROR',
      message: 'Connection refused',
      blocking: true,
    }))
  })

  it('emits Error with fallback message on STOMP error', () => {
    const handler = vi.fn()
    events.on(EventType.Error, handler)
    const onStompError = connection['stompClient'].onStompError as unknown as (frame: { headers: Record<string, string> }) => void
    onStompError({ headers: {} })
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      code: 'STOMP_ERROR',
      blocking: true,
    }))
  })

  it('sets DISCONNECTED when max retries exceeded on WS close', () => {
    connection['retryCount'] = 20
    const cb = connection['stompClient'].onWebSocketClose as unknown as () => void
    cb()
    expect(connection.state).toBe(ConnectionState.DISCONNECTED)
  })

  it('dispatches EVENT/TYPING correctly', () => {
    const handler = vi.fn()
    events.on(EventType.TypingChange, handler)
    connection.connect()
    const oc = connection['stompClient'].onConnect as unknown as () => void
    oc()
    const subscribeCalls = (connection['stompClient'].subscribe as ReturnType<typeof vi.fn>).mock.calls
    const fn = subscribeCalls[0]![1] as (msg: { body: string; ack: () => void }) => void
    fn({ body: JSON.stringify({ messageType: 'EVENT', type: 'TYPING', state: 'START_TYPING', from: 'u1' }), ack: vi.fn() })
    expect(handler).toHaveBeenCalledWith({ state: 'START_TYPING', from: 'u1' })
  })

  it('dispatches EVENT/PRESENCE correctly', () => {
    const handler = vi.fn()
    events.on(EventType.PresenceChange, handler)
    connection.connect()
    const oc = connection['stompClient'].onConnect as unknown as () => void
    oc()
    const subscribeCalls = (connection['stompClient'].subscribe as ReturnType<typeof vi.fn>).mock.calls
    const fn = subscribeCalls[0]![1] as (msg: { body: string; ack: () => void }) => void
    fn({ body: JSON.stringify({ messageType: 'EVENT', type: 'PRESENCE', presence: 'ONLINE', from: 'u1' }), ack: vi.fn() })
    expect(handler).toHaveBeenCalledWith({ presence: 'ONLINE', from: 'u1' })
  })

  it('dispatches EVENT/DELIVERY correctly', () => {
    const handler = vi.fn()
    events.on(EventType.MessageDelivery, handler)
    connection.connect()
    const oc = connection['stompClient'].onConnect as unknown as () => void
    oc()
    const subscribeCalls = (connection['stompClient'].subscribe as ReturnType<typeof vi.fn>).mock.calls
    const fn = subscribeCalls[0]![1] as (msg: { body: string; ack: () => void }) => void
    fn({ body: JSON.stringify({ messageType: 'EVENT', type: 'DELIVERY', clientMessageId: 'id1', deliveryState: 'SERVER' }), ack: vi.fn() })
    expect(handler).toHaveBeenCalledWith({ clientMessageId: 'id1', deliveryState: 'SERVER' })
  })

  it('dispatches EVENT/WRTC as message event', () => {
    const handler = vi.fn()
    events.on(EventType.Message, handler)
    connection.connect()
    const oc = connection['stompClient'].onConnect as unknown as () => void
    oc()
    const subscribeCalls = (connection['stompClient'].subscribe as ReturnType<typeof vi.fn>).mock.calls
    const fn = subscribeCalls[0]![1] as (msg: { body: string; ack: () => void }) => void
    fn({ body: JSON.stringify({ messageType: 'EVENT', type: 'WRTC', rtcObject: {} }), ack: vi.fn() })
    expect(handler).toHaveBeenCalled()
  })

  it('dispatches IM (non-EVENT) as message event', () => {
    const handler = vi.fn()
    events.on(EventType.Message, handler)
    connection.connect()
    const oc = connection['stompClient'].onConnect as unknown as () => void
    oc()
    const subscribeCalls = (connection['stompClient'].subscribe as ReturnType<typeof vi.fn>).mock.calls
    const fn = subscribeCalls[0]![1] as (msg: { body: string; ack: () => void }) => void
    fn({ body: JSON.stringify({ messageType: 'IM', room: 'r1', text: 'hi', from: 'u1', createdAt: '2024-01-01', clientMessageId: 'id1' }), ack: vi.fn() })
    expect(handler).toHaveBeenCalled()
  })

  it('onDisconnect sets state to DISCONNECTED', () => {
    const cb = connection['stompClient'].onDisconnect as unknown as () => void
    cb()
    expect(connection.state).toBe(ConnectionState.DISCONNECTED)
  })
})
