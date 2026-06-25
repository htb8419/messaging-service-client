export const CallState = {
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
  END_CALL: 'END_CALL',
} as const

export type CallState = (typeof CallState)[keyof typeof CallState]
