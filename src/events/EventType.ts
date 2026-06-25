export const EventType = {
  Message:           'message',
  ConnectionChange:  'connection:change',
  CallChange:        'call:change',
  MessageDelivery:   'message:delivery',
  TypingChange:      'typing:change',
  PresenceChange:    'presence:change',
  Error:             'error',
} as const

export type EventType = (typeof EventType)[keyof typeof EventType]
