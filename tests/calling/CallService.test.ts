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
import { RtcSignalType } from '../../src/calling/types'

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

  it('endCall with forceCloseSession emits END_CALL', async () => {
    const handler = vi.fn()
    events.on(EventType.CallChange, handler)
    await service.endCall(true)
    const call = handler.mock.calls[0]![0]!
    expect(call.state).toBe('END_CALL')
  })

  it('handleSignal END_CALL closes and emits', async () => {
    const handler = vi.fn()
    events.on(EventType.CallChange, handler)
    await service.handleSignal(RtcSignalType.END_CALL, {})
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ state: 'END_CALL' }))
  })

  it('handleSignal unrecognized type emits nothing', async () => {
    const handler = vi.fn()
    events.on(EventType.CallChange, handler)
    await service.handleSignal('UNKNOWN', {})
    expect(handler).not.toHaveBeenCalled()
  })

  it('sendDeliveryAck sends delivery event', async () => {
    const spy = vi.spyOn(messageService['connection'], 'send')
    await messageService.sendDeliveryAck('msg1', 'SERVER')
    const [dest, , body] = spy.mock.calls[0]!
    expect(dest).toBe('/app/event')
    const parsed = JSON.parse(body!)
    expect(parsed.type).toBe('DELIVERY')
  })

  it('sendEvent sends custom event', async () => {
    const spy = vi.spyOn(messageService['connection'], 'send')
    await messageService.sendEvent('CUSTOM', { key: 'val' })
    const [dest, , body] = spy.mock.calls[0]!
    expect(dest).toBe('/app/event')
    const parsed = JSON.parse(body!)
    expect(parsed.type).toBe('CUSTOM')
  })

  it('sendMessage with file throws', async () => {
    const fakeFile = new File([''], 'test.txt')
    await expect(messageService.sendMessage('', fakeFile)).rejects.toThrow('File upload not yet implemented')
  })
})
