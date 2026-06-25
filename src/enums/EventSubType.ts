export const EventSubType = {
  TYPING: 'TYPING',
  PRESENCE: 'PRESENCE',
  DELIVERY: 'DELIVERY',
  WRTC: 'WRTC',
} as const

export type EventSubType = (typeof EventSubType)[keyof typeof EventSubType]
