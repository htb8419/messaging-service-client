import type { OutgoingMessage } from '../events/types'
import { MessageType } from '../enums/MessageType'
import { type EventSubType } from '../enums/EventSubType'

export class MessageBuilder {
  private sequenceNumber = 1

  constructor(private readonly sessionId: string) {}

  async buildMessage(
    roomId: string,
    messageType: MessageType,
    payload: Record<string, unknown>,
  ): Promise<OutgoingMessage> {
    if (!roomId) {
      throw new Error('room is required')
    }
    const messageId = `${this.sessionId}.${Date.now()}.${this.sequenceNumber++}`
    return {
      messageType,
      room: roomId,
      clientMessageId: messageId,
      ...payload,
    } as OutgoingMessage
  }

  async buildEvent(
    roomId: string,
    eventType: EventSubType,
    payload: Record<string, unknown>,
  ): Promise<OutgoingMessage> {
    return this.buildMessage(roomId, MessageType.EVENT, {
      type: eventType,
      ...payload,
    })
  }
}
