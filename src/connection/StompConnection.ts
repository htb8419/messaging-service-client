import { Client as StompClient } from '@stomp/stompjs'
import type { Config } from '../core/Config'
import type { Auth } from '../core/Auth'
import { TypedEmitter } from '../core/TypedEmitter'
import { ConnectionState } from '../enums/ConnectionState'
import { EventType } from '../events/EventType'
import { StompDestinations } from '../events/types'
import type {
  MessagingEventMap,
  ConnectionStateEvent,
  ReceivedMessage,
  MessagingError,
} from '../events/types'

export class StompConnection {
  private readonly stompClient: StompClient
  private _state: ConnectionState = ConnectionState.IDLE
  private retryCount = 0

  constructor(
    private readonly config: Config,
    private readonly auth: Auth,
    private readonly events: TypedEmitter<MessagingEventMap>,
  ) {
    const brokerURL = `${config.socketUrl}/websocket?access_token=${auth.accessToken}&sid=${auth.sessionId}`

    this.stompClient = new StompClient({
      brokerURL,
      debug: (msg: string) => console.debug('$stomp', msg),
      connectionTimeout: 5000,
      reconnectDelay: config.reconnectDelay,
      heartbeatIncoming: config.heartbeatIncoming,
      heartbeatOutgoing: config.heartbeatOutgoing,
    })

    this.stompClient.onConnect = () => {
      this.retryCount = 0
      this.setState(ConnectionState.CONNECTED)
      this.subscribe()
    }

    this.stompClient.onDisconnect = () => {
      this.setState(ConnectionState.DISCONNECTED)
    }

    this.stompClient.onStompError = (frame) => {
      console.error('STOMP error:', frame.headers['message'])
      this.events.emit(EventType.Error, {
        code: 'STOMP_ERROR',
        message: frame.headers['message'] || 'STOMP protocol error',
        blocking: true,
      } as MessagingError)
    }

    this.stompClient.onWebSocketClose = () => {
      if (this.retryCount >= this.config.maxReconnectAttempts) {
        this.setState(ConnectionState.DISCONNECTED)
      }
    }
  }

  get state(): ConnectionState {
    return this._state
  }

  connect(): void {
    if (this._state === ConnectionState.CONNECTED) return
    this.setState(ConnectionState.CONNECTING)
    this.stompClient.activate()
  }

  async disconnect(): Promise<void> {
    await this.stompClient.deactivate()
    this.setState(ConnectionState.DISCONNECTED)
  }

  send(destination: string, headers: Record<string, string>, body: string): void {
    this.stompClient.publish({ destination, headers, body })
  }

  private subscribe(): void {
    const sid = this.auth.sessionId
    const handler = (message: { body: string; ack: () => void }) => {
      message.ack()
      const payload = JSON.parse(message.body) as {
        messageType?: string
        type?: string
        state?: string
        presence?: string
        deliveryState?: 'SERVER' | 'CLIENT'
        clientMessageId?: string
        room?: string
        from?: string
        createdAt?: string
        text?: string
        media?: unknown[]
      }

      this.dispatchMessage(payload)
    }

    this.stompClient.subscribe(StompDestinations.EVENT(sid), handler, { ack: 'client' })
    this.stompClient.subscribe(StompDestinations.IM(sid), handler, { ack: 'client' })
  }

  private dispatchMessage(payload: Record<string, unknown>): void {
    const messageType = payload.messageType as string | undefined

    if (messageType === 'EVENT') {
      const eventType = payload.type as string | undefined
      if (eventType === 'TYPING') {
        this.events.emit(EventType.TypingChange, {
          state: (payload.state as 'START_TYPING' | 'STOP_TYPING') || 'STOP_TYPING',
          from: payload.from as string || '',
        })
      } else if (eventType === 'PRESENCE') {
        this.events.emit(EventType.PresenceChange, {
          presence: (payload.presence as 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE') || 'OFFLINE',
          from: payload.from as string || '',
        })
      } else if (eventType === 'DELIVERY') {
        this.events.emit(EventType.MessageDelivery, {
          clientMessageId: payload.clientMessageId as string || '',
          deliveryState: (payload.deliveryState as 'SERVER' | 'CLIENT') || 'SERVER',
        })
      } else if (eventType === 'WRTC') {
        // WebRTC signals go to CallService via the message event with type WRTC
        this.events.emit(EventType.Message, payload as unknown as ReceivedMessage)
      }
    } else {
      this.events.emit(EventType.Message, payload as unknown as ReceivedMessage)
    }
  }

  private setState(state: ConnectionState): void {
    this._state = state
    this.events.emit(EventType.ConnectionChange, {
      state,
      connected: state === ConnectionState.CONNECTED,
    } as ConnectionStateEvent)
  }
}
