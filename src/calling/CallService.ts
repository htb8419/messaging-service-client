import type { Config } from '../core/Config'
import type { TypedEmitter } from '../core/TypedEmitter'
import type { MessageService } from '../messaging/MessageService'
import type { MessagingEventMap, CallStateEvent } from '../events/types'
import { EventType } from '../events/EventType'
import { CallState } from '../enums/CallState'
import { RtcSignalType } from './types'
import { PeerConnection } from './PeerConnection'
import { MediaManager } from './MediaManager'

export class CallService {
  private peerConnection: PeerConnection
  private localStream: MediaStream | null = null
  private isCaller = false
  private autoReconnectCount = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private readonly config: Config,
    private readonly events: TypedEmitter<MessagingEventMap>,
    private readonly messageService: MessageService,
  ) {
    this.peerConnection = new PeerConnection(config.rtcConfig, (type, payload) => {
      void this.messageService.sendRtcSignal(type, payload)
    })
  }

  get isInCall(): boolean {
    return this.peerConnection.connection !== null
  }

  async makeCall(): Promise<void> {
    if (this.isCaller && this.peerConnection.connection) return

    this.isCaller = true
    const stream = await this.acquireMedia()
    this.localStream = stream

    this.peerConnection.create(stream)
    this.emitState(CallState.CONNECTING)
    await this.messageService.sendRtcSignal(RtcSignalType.CALL_REQUEST, {})
  }

  async endCall(forceCloseSession = false): Promise<void> {
    this.clearReconnectTimer()
    this.peerConnection.close()
    MediaManager.stopAllTracks(this.localStream)
    this.localStream = null
    this.isCaller = false
    this.autoReconnectCount = 0

    await this.messageService.sendRtcSignal(RtcSignalType.END_CALL, { forceCloseSession })
    this.emitState(forceCloseSession ? CallState.END_CALL : CallState.DISCONNECTED)
  }

  async handleSignal(type: string, payload: unknown): Promise<void> {
    switch (type) {
      case RtcSignalType.CALL_REQUEST:
        this.isCaller = false
        await this.handleIncomingCall()
        break
      case RtcSignalType.CALL_ACCEPTED:
        await this.peerConnection.createOffer()
        this.scheduleReconnect()
        break
      case RtcSignalType.OFFER:
        await this.peerConnection.setRemoteDescription(payload as RTCSessionDescriptionInit)
        await this.peerConnection.createAnswer()
        break
      case RtcSignalType.ANSWER:
        await this.peerConnection.setRemoteDescription(payload as RTCSessionDescriptionInit)
        break
      case RtcSignalType.CANDIDATE:
        await this.peerConnection.addIceCandidate(payload as RTCIceCandidateInit)
        break
      case RtcSignalType.END_CALL:
        this.peerConnection.close()
        MediaManager.stopAllTracks(this.localStream)
        this.localStream = null
        this.emitState(CallState.END_CALL)
        break
    }
  }

  toggleMicrophone(enabled: boolean): void {
    if (this.localStream) {
      MediaManager.toggleTrack(this.localStream, 'audio', enabled)
    }
  }

  toggleCamera(enabled: boolean): void {
    if (this.localStream) {
      MediaManager.toggleTrack(this.localStream, 'video', enabled)
    }
  }

  private async handleIncomingCall(): Promise<void> {
    const stream = await this.acquireMedia()
    this.localStream = stream
    this.peerConnection.create(stream)
    this.emitState(CallState.CONNECTING)
    await this.messageService.sendRtcSignal(RtcSignalType.CALL_ACCEPTED, {})
  }

  private async acquireMedia(): Promise<MediaStream> {
    const constraints = await MediaManager.getAvailableConstraints(
      this.config.mediaConstraints as MediaStreamConstraints
    )
    return MediaManager.getUserMedia(constraints)
  }

  private scheduleReconnect(): void {
    this.reconnectTimer = setTimeout(() => {
      if (this.peerConnection.getState() !== 'connected' && this.autoReconnectCount < 2) {
        this.autoReconnectCount++
        this.messageService.sendRtcSignal(RtcSignalType.END_CALL, {})
          .then(() => this.makeCall())
      }
    }, 3000)
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private emitState(state: CallStateEvent['state']): void {
    this.events.emit(EventType.CallChange, {
      state,
    })
  }
}
