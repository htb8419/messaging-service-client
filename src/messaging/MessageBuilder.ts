import type { OutgoingMessage } from '../events/types'

export class MessageBuilder {
  private sequenceNumber = 1

  constructor(private readonly sessionId: string) {}

  async buildMessage(
    roomId: string,
    messageType: string,
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
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<OutgoingMessage> {
    return this.buildMessage(roomId, 'EVENT', {
      type: eventType,
      ...payload,
    })
  }
}
