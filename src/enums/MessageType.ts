export const MessageType = {
  INSTANT: 'IM',
  EVENT: 'EVENT',
} as const

export type MessageType = (typeof MessageType)[keyof typeof MessageType]
