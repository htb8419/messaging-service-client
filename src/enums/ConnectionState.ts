export const ConnectionState = {
  IDLE: 'IDLE',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
} as const

export type ConnectionState = (typeof ConnectionState)[keyof typeof ConnectionState]
