import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@stomp/stompjs', () => ({
  Client: vi.fn(() => ({
    activate: vi.fn(), deactivate: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    publish: vi.fn(), onConnect: undefined, onDisconnect: undefined,
    onStompError: undefined, onWebSocketClose: undefined, connected: false,
  })),
}))

import { CallService } from '../../src/calling/CallService'
import { Config, type MessagingOptions } from '../../src/core/Config'
import { Auth } from '../../src/core/Auth'
import { TypedEmitter } from '../../src/core/TypedEmitter'
import { StompConnection } from '../../src/connection/StompConnection'
import { MessageService } from '../../src/messaging/MessageService'
import type { MessagingEventMap } from '../../src/events/types'
import { EventType } from '../../src/events/EventType'

const token = btoa(JSON.stringify({ alg: 'HS256' })) + '.' + btoa(JSON.stringify({ user_name: 'u1' })) + '.sig'
const options: MessagingOptions = { serverUrl: 'https://x.com', accessToken: token, roomId: 'r1' }

describe('CallService', () => {
  let service: CallService
  let events: TypedEmitter<MessagingEventMap>
  let messageService: MessageService

  beforeEach(() => {
    vi.clearAllMocks()
    const config = new Config(options)
    const auth = new Auth(token)
    events = new TypedEmitter<MessagingEventMap>()
    const connection = new StompConnection(config, auth, events)
    messageService = new MessageService(connection, config, auth)
    service = new CallService(config, events, messageService)
  })

  it('starts not in a call', () => {
    expect(service.isInCall).toBe(false)
  })

  it('toggleMicrophone and toggleCamera do not throw when no call', () => {
    expect(() => service.toggleMicrophone(false)).not.toThrow()
    expect(() => service.toggleCamera(true)).not.toThrow()
  })

  it('emit CallChange on endCall', async () => {
    const handler = vi.fn()
    events.on(EventType.CallChange, handler)
    await service.endCall()
    expect(handler).toHaveBeenCalled()
  })
})
