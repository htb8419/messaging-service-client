import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MessageService } from '../../src/messaging/MessageService'
import { StompConnection } from '../../src/connection/StompConnection'
import { Config, type MessagingOptions } from '../../src/core/Config'
import { Auth } from '../../src/core/Auth'
import { TypedEmitter } from '../../src/core/TypedEmitter'
import type { MessagingEventMap } from '../../src/events/types'

vi.mock('@stomp/stompjs', () => ({
  Client: vi.fn().mockImplementation(() => ({
    activate: vi.fn(),
    deactivate: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    publish: vi.fn(),
    onConnect: undefined,
    onDisconnect: undefined,
    onStompError: undefined,
    onWebSocketClose: undefined,
    connected: false,
  })),
}))

const token = btoa(JSON.stringify({ alg: 'HS256' })) + '.' + btoa(JSON.stringify({ user_name: 'user1' })) + '.sig'
const options: MessagingOptions = { serverUrl: 'https://x.com', accessToken: token, roomId: 'room-1' }

describe('MessageService', () => {
  let service: MessageService
  let connection: StompConnection

  beforeEach(() => {
    vi.clearAllMocks()
    const config = new Config(options)
    const auth = new Auth(token)
    const events = new TypedEmitter<MessagingEventMap>()
    connection = new StompConnection(config, auth, events)
    service = new MessageService(connection, config, auth)
  })

  it('sendMessage publishes to /app/im', async () => {
    const sendSpy = vi.spyOn(connection, 'send')
    await service.sendMessage('hello world')
    expect(sendSpy).toHaveBeenCalled()
    const [dest, headers, body] = sendSpy.mock.calls[0]!
    expect(dest).toBe('/app/im')
    const parsed = JSON.parse(body!)
    expect(parsed.text).toBe('hello world')
    expect(parsed.messageType).toBe('IM')
    expect(parsed.room).toBe('room-1')
  })

  it('sendTypingState publishes START_TYPING event', async () => {
    const sendSpy = vi.spyOn(connection, 'send')
    await service.sendTypingState('START_TYPING')
    const [dest, , body] = sendSpy.mock.calls[0]!
    expect(dest).toBe('/app/event')
    const parsed = JSON.parse(body!)
    expect(parsed.type).toBe('TYPING')
    expect(parsed.state).toBe('START_TYPING')
  })

  it('sendPresence publishes presence event', async () => {
    const sendSpy = vi.spyOn(connection, 'send')
    await service.sendPresence('ONLINE')
    const [dest, , body] = sendSpy.mock.calls[0]!
    expect(dest).toBe('/app/event')
    const parsed = JSON.parse(body!)
    expect(parsed.type).toBe('PRESENCE')
    expect(parsed.presence).toBe('ONLINE')
  })

  it('sendRtcSignal publishes WRTC event', async () => {
    const sendSpy = vi.spyOn(connection, 'send')
    await service.sendRtcSignal('CALL_REQUEST', {})
    const [dest, , body] = sendSpy.mock.calls[0]!
    expect(dest).toBe('/app/event')
    const parsed = JSON.parse(body!)
    expect(parsed.type).toBe('WRTC')
    expect(parsed.state).toBe('CALL_REQUEST')
  })
})
