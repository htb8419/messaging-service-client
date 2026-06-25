export interface StompSubscription {
  destination: string
  unsubscribe: () => void
}

export interface StompSendHeaders {
  sent: string  // ISO timestamp
  'content-type': string
}
