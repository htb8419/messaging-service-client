export interface RtcIceServer {
  urls: string
  credential?: string
  username?: string
}

export interface RtcConfig {
  iceServers?: RtcIceServer[]
}

export interface MediaConstraints {
  video?: MediaTrackConstraints | boolean
  audio?: MediaTrackConstraints | boolean
}

export interface MessagingOptions {
  serverUrl: string
  accessToken: string
  roomId: string
  heartbeatIncoming?: number
  heartbeatOutgoing?: number
  reconnectDelay?: number
  maxReconnectAttempts?: number
  rtcConfig?: RtcConfig
  mediaConstraints?: MediaConstraints
}

const DEFAULT_RTC_CONFIG: Required<RtcConfig> = {
  iceServers: [
    { urls: 'stun:turn.demisco.com:5349' },
    { urls: 'turn:turn.demisco.com:5349', credential: 'turn', username: 'turn' },
  ],
}

const DEFAULT_MEDIA_CONSTRAINTS: MediaConstraints = {
  video: {
    width: { min: 384, ideal: 640, max: 1280 },
    height: { min: 216, ideal: 360, max: 720 },
    frameRate: { min: 16, max: 24 },
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
  },
}

export class Config {
  readonly serverUrl: string
  readonly socketUrl: string
  readonly fileServiceUrl: string
  readonly roomId: string
  readonly heartbeatIncoming: number
  readonly heartbeatOutgoing: number
  readonly reconnectDelay: number
  readonly maxReconnectAttempts: number
  readonly rtcConfig: Required<RtcConfig>
  readonly mediaConstraints: MediaConstraints

  constructor(options: MessagingOptions) {
    if (!options.serverUrl) {
      throw new Error('serverUrl is required')
    }

    this.serverUrl = options.serverUrl
    this.fileServiceUrl = `${options.serverUrl}/fs/file`
    this.socketUrl = options.serverUrl.startsWith('https://')
      ? options.serverUrl.replace('https://', 'wss://') + '/ws-adapter'
      : options.serverUrl.replace('http://', 'ws://') + '/ws-adapter'

    this.roomId = options.roomId
    this.heartbeatIncoming = options.heartbeatIncoming ?? 20000
    this.heartbeatOutgoing = options.heartbeatOutgoing ?? 20000
    this.reconnectDelay = options.reconnectDelay ?? 3000
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 20

    this.rtcConfig = {
      iceServers: options.rtcConfig?.iceServers ?? DEFAULT_RTC_CONFIG.iceServers,
    }
    this.mediaConstraints = options.mediaConstraints ?? DEFAULT_MEDIA_CONSTRAINTS
  }
}
