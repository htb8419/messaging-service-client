export { MessagingClient } from './MessagingClient'
export { EventType } from './events/EventType'

// Enum const objects (runtime values for JS consumers) + their types
export { ConnectionState } from './enums/ConnectionState'
export type { ConnectionState as ConnectionStateType } from './enums/ConnectionState'
export { CallState } from './enums/CallState'
export type { CallState as CallStateType } from './enums/CallState'
export { PresenceState } from './enums/PresenceState'
export type { PresenceState as PresenceStateType } from './enums/PresenceState'
export { TypingState } from './enums/TypingState'
export type { TypingState as TypingStateType } from './enums/TypingState'
export { EventSubType } from './enums/EventSubType'
export type { EventSubType as EventSubTypeType } from './enums/EventSubType'

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
