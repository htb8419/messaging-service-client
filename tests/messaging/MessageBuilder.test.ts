import { describe, it, expect } from 'vitest'
import { MessageBuilder } from '../../src/messaging/MessageBuilder'

describe('MessageBuilder', () => {
  const builder = new MessageBuilder('session-1')

  it('builds a basic instant message', async () => {
    const msg = await builder.buildMessage('room-1', 'IM', { text: 'hello' })
    expect(msg.messageType).toBe('IM')
    expect(msg.room).toBe('room-1')
    expect(msg.text).toBe('hello')
    expect(msg.clientMessageId).toMatch(/^session-1\.\d+\.1$/)
  })

  it('increments sequence number per message', async () => {
    const msg1 = await builder.buildMessage('room-1', 'IM', { text: 'a' })
    const msg2 = await builder.buildMessage('room-1', 'IM', { text: 'b' })
    expect(msg1.clientMessageId).toMatch(/\.\d+\.\d+$/)
    expect(msg2.clientMessageId).toMatch(/\.\d+\.\d+$/)
    const seq1 = msg1.clientMessageId.split('.').pop()
    const seq2 = msg2.clientMessageId.split('.').pop()
    expect(Number(seq2)).toBeGreaterThan(Number(seq1))
  })

  it('builds event message with type', async () => {
    const msg = await builder.buildEvent('room-1', 'TYPING', { state: 'START_TYPING' })
    expect(msg.messageType).toBe('EVENT')
    expect(msg.type).toBe('TYPING')
    expect(msg.state).toBe('START_TYPING')
  })

  it('throws when room id is empty', async () => {
    await expect(builder.buildMessage('', 'IM', { text: 'x' })).rejects.toThrow('room is required')
  })
})
