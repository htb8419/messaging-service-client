import type { ConnectionState } from '../enums/ConnectionState'
import type { CallState } from '../enums/CallState'
import type { PresenceState } from '../enums/PresenceState'

export interface ConnectionStateEvent {
  state: ConnectionState
  connected: boolean
}

export interface ReceivedMessage {
  room: string
  from: string
  createdAt: string
  clientMessageId: string
  messageType: string
  text?: string
  media?: MediaAttachment[]
}

export interface MediaAttachment {
  fileId: string
  name: string
  mimeType: string
  size: number
}

export interface MessageDeliveryEvent {
  clientMessageId: string
  deliveryState: 'SERVER' | 'CLIENT'
}

export interface TypingEvent {
  state: 'START_TYPING' | 'STOP_TYPING'
  from: string
}

export interface PresenceEvent {
  presence: PresenceState
  from: string
}

export interface CallStateEvent {
  state: CallState
}

export interface OutgoingMessage {
  messageType: string
  room: string
  clientMessageId: string
  text?: string
  media?: MediaAttachment[]
  type?: string
  state?: string
  rtcObject?: unknown
  presence?: string
}

export interface MessagingError extends Error {
  code?: string
  blocking: boolean
}

export interface MessagingEventMap {
  'message':            (msg: ReceivedMessage) => void
  'connection:change':  (state: ConnectionStateEvent) => void
  'call:change':        (state: CallStateEvent) => void
  'message:delivery':   (event: MessageDeliveryEvent) => void
  'typing:change':      (event: TypingEvent) => void
  'presence:change':    (event: PresenceEvent) => void
  'error':              (error: MessagingError) => void
}

// STOMP subscription destination URLs
export const StompDestinations = {
  EVENT: (sessionId: string) => `/user/${sessionId}/queue/event`,
  IM: (sessionId: string) => `/user/${sessionId}/queue/im`,
  SEND_EVENT: '/app/event',
  SEND_IM: '/app/im',
} as const
