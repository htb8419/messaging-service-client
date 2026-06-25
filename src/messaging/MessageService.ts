import type { StompConnection } from '../connection/StompConnection'
import type { Config } from '../core/Config'
import type { Auth } from '../core/Auth'
import { MessageBuilder } from './MessageBuilder'
import { StompDestinations } from '../events/types'
import type { OutgoingMessage } from '../events/types'

export class MessageService {
  private readonly builder: MessageBuilder

  constructor(
    private readonly connection: StompConnection,
    private readonly config: Config,
    auth: Auth,
  ) {
    this.builder = new MessageBuilder(auth.sessionId)
  }

  async sendMessage(text: string, _file?: File): Promise<void> {
    const payload: Record<string, unknown> = { text }

    if (_file) {
      throw new Error('File upload not yet implemented — use FileService.upload() first')
    }

    const message = await this.builder.buildMessage(this.config.roomId, 'IM', payload)
    this.connection.send(
      StompDestinations.SEND_IM,
      {
        sent: String(Date.now()),
        'content-type': 'application/json',
      },
      JSON.stringify({ ...message, isMessageOut: true }),
    )
  }

  async sendTypingState(state: string): Promise<void> {
    const message = await this.builder.buildEvent(this.config.roomId, 'TYPING', { state })
    this.sendEventMessage(message)
  }

  async sendPresence(presence: string): Promise<void> {
    const message = await this.builder.buildEvent(this.config.roomId, 'PRESENCE', { presence })
    this.sendEventMessage(message)
  }

  async sendDeliveryAck(clientMessageId: string, deliveryState: 'SERVER' | 'CLIENT'): Promise<void> {
    const message = await this.builder.buildEvent(this.config.roomId, 'DELIVERY', {
      clientMessageId,
      deliveryState,
    })
    this.sendEventMessage(message)
  }

  async sendRtcSignal(state: string, rtcObject: unknown): Promise<void> {
    const message = await this.builder.buildEvent(this.config.roomId, 'WRTC', { state, rtcObject })
    this.sendEventMessage(message)
  }

  async sendEvent(type: string, payload: Record<string, unknown>): Promise<void> {
    const message = await this.builder.buildEvent(this.config.roomId, type, payload)
    this.sendEventMessage(message)
  }

  private sendEventMessage(message: OutgoingMessage): void {
    this.connection.send(
      StompDestinations.SEND_EVENT,
      {
        sent: String(Date.now()),
        'content-type': 'application/json',
      },
      JSON.stringify(message),
    )
  }
}
