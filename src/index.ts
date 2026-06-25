export { MessagingClient } from './MessagingClient'
export { EventType } from './events/EventType'

// Types for consumers
export type { MessagingOptions, RtcConfig, RtcIceServer, MediaConstraints } from './core/Config'
export type {
  ReceivedMessage,
  MediaAttachment,
  ConnectionStateEvent,
  CallStateEvent,
  MessageDeliveryEvent,
  TypingEvent,
  PresenceEvent,
  MessagingError,
  MessagingEventMap,
} from './events/types'
export type { ConnectionState } from './enums/ConnectionState'
export type { CallState } from './enums/CallState'
export type { PresenceState } from './enums/PresenceState'
export type { TypingState } from './enums/TypingState'
