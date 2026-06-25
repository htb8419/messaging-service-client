import type { RtcConfig } from '../core/Config'
import { RtcSignalType } from './types'
import type { RtcSignalType as RtcSignal } from './types'

export type RtcSignalCallback = (type: RtcSignal, payload: unknown) => void

export class PeerConnection {
  private pc: RTCPeerConnection | null = null
  private onSignal: RtcSignalCallback

  constructor(
    private readonly rtcConfig: Required<RtcConfig>,
    onSignal: RtcSignalCallback,
  ) {
    this.onSignal = onSignal
  }

  get connection(): RTCPeerConnection | null {
    return this.pc
  }

  create(stream: MediaStream): void {
    if (this.pc) {
      this.close()
    }

    this.pc = new RTCPeerConnection(this.rtcConfig)

    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.onSignal(RtcSignalType.CANDIDATE, candidate)
      }
    }

    this.pc.ontrack = ({ streams }) => {
      const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement | null
      if (remoteVideo) {
        remoteVideo.srcObject = streams[0]!
      }
    }

    stream.getTracks().forEach(track => {
      this.pc!.addTrack(track, stream)
    })
  }

  async createOffer(): Promise<void> {
    if (!this.pc) throw new Error('PeerConnection not created')
    const offer = await this.pc.createOffer({
      iceRestart: true,
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    })
    await this.pc.setLocalDescription(offer)
    this.onSignal(RtcSignalType.OFFER, offer)
  }

  async createAnswer(): Promise<void> {
    if (!this.pc) throw new Error('PeerConnection not created')
    const answer = await this.pc.createAnswer()
    await this.pc.setLocalDescription(answer)
    this.onSignal(RtcSignalType.ANSWER, answer)
  }

  async setRemoteDescription(sdp: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) throw new Error('PeerConnection not created')
    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp))
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc || !this.pc.currentRemoteDescription) return
    await this.pc.addIceCandidate(new RTCIceCandidate(candidate))
  }

  getState(): string {
    return this.pc?.connectionState ?? 'closed'
  }

  close(): void {
    if (!this.pc) return
    this.pc.getTransceivers().forEach(t => t.stop())
    this.pc.onicecandidate = null
    this.pc.ontrack = null
    this.pc.close()
    this.pc = null
  }
}
