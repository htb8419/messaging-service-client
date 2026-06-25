export const PresenceState = {
  ONLINE: 'ONLINE',
  AWAY: 'AWAY',
  BUSY: 'BUSY',
  OFFLINE: 'OFFLINE',
} as const

export type PresenceState = (typeof PresenceState)[keyof typeof PresenceState]
