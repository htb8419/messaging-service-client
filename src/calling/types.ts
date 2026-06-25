export const RtcSignalType = {
  CALL_REQUEST: 'CALL_REQUEST',
  CALL_ACCEPTED: 'CALL_ACCEPTED',
  OFFER: 'OFFER',
  ANSWER: 'ANSWER',
  CANDIDATE: 'CANDIDATE',
  END_CALL: 'END_CALL',
} as const

export type RtcSignalType = (typeof RtcSignalType)[keyof typeof RtcSignalType]
