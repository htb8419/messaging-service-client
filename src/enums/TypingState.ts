export const TypingState = {
  START: 'START_TYPING',
  STOP: 'STOP_TYPING',
} as const

export type TypingState = (typeof TypingState)[keyof typeof TypingState]
