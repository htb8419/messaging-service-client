import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PeerConnection } from '../../src/calling/PeerConnection'
import { RtcSignalType } from '../../src/calling/types'
import type { RtcConfig } from '../../src/core/Config'

describe('PeerConnection', () => {
  let pc: PeerConnection
  let onSignal: ReturnType<typeof vi.fn>
  let mockRtcConfig: Required<RtcConfig>
  let mockStream: MediaStream

  beforeEach(() => {
    onSignal = vi.fn()
    mockRtcConfig = { iceServers: [{ urls: 'stun:test:3478' }] }

    const mockPC = {
      createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'sdp' }),
      createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'sdp' }),
      setLocalDescription: vi.fn().mockResolvedValue(undefined),
      setRemoteDescription: vi.fn().mockResolvedValue(undefined),
      addIceCandidate: vi.fn().mockResolvedValue(undefined),
      addTrack: vi.fn(),
      close: vi.fn(),
      getTransceivers: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
      onicecandidate: null as unknown,
      ontrack: null as unknown,
      connectionState: 'new' as RTCPeerConnectionState,
      currentRemoteDescription: null,
    }

    vi.stubGlobal('RTCPeerConnection', vi.fn(() => mockPC))
    vi.stubGlobal('RTCSessionDescription', vi.fn((sdp: RTCSessionDescriptionInit) => sdp))
    vi.stubGlobal('RTCIceCandidate', vi.fn((c: RTCIceCandidateInit) => c))

    mockStream = { getTracks: () => [{ kind: 'video', stop: vi.fn() }] } as unknown as MediaStream
    pc = new PeerConnection(mockRtcConfig, onSignal)
  })

  it('starts with null connection', () => {
    expect(pc.connection).toBeNull()
  })

  it('create() builds RTCPeerConnection', () => {
    pc.create(mockStream)
    expect(pc.connection).not.toBeNull()
    expect(RTCPeerConnection).toHaveBeenCalledWith(mockRtcConfig)
  })

  it('create() adds tracks from stream', () => {
    pc.create(mockStream)
    expect(pc.connection!.addTrack).toHaveBeenCalled()
  })

  it('create() closes existing connection first', () => {
    pc.create(mockStream)
    const first = pc.connection
    pc.create(mockStream)
    expect(first!.close).toHaveBeenCalled()
  })

  it('create() signals ICE candidates', () => {
    pc.create(mockStream)
    const onice = pc.connection!.onicecandidate as unknown as (e: { candidate: unknown }) => void
    onice({ candidate: { candidate: 'test' } })
    expect(onSignal).toHaveBeenCalledWith(RtcSignalType.CANDIDATE, { candidate: 'test' })
  })

  it('create() ignores null candidate', () => {
    pc.create(mockStream)
    const onice = pc.connection!.onicecandidate as unknown as (e: { candidate: unknown }) => void
    onice({ candidate: null })
    expect(onSignal).not.toHaveBeenCalled()
  })

  it('create() handles ontrack with remoteVideo element', () => {
    const mockVideo = { srcObject: null }
    vi.stubGlobal('document', { getElementById: vi.fn(() => mockVideo) })
    pc.create(mockStream)
    const ontrack = pc.connection!.ontrack as unknown as (e: { streams: MediaStream[] }) => void
    const rs = {} as MediaStream
    ontrack({ streams: [rs] })
    expect(mockVideo.srcObject).toBe(rs)
  })

  it('createOffer() throws when not created', async () => {
    await expect(pc.createOffer()).rejects.toThrow('PeerConnection not created')
  })

  it('createOffer() sends OFFER signal', async () => {
    pc.create(mockStream)
    await pc.createOffer()
    expect(onSignal).toHaveBeenCalledWith(RtcSignalType.OFFER, { type: 'offer', sdp: 'sdp' })
  })

  it('createAnswer() throws when not created', async () => {
    await expect(pc.createAnswer()).rejects.toThrow('PeerConnection not created')
  })

  it('createAnswer() sends ANSWER signal', async () => {
    pc.create(mockStream)
    await pc.createAnswer()
    expect(onSignal).toHaveBeenCalledWith(RtcSignalType.ANSWER, { type: 'answer', sdp: 'sdp' })
  })

  it('setRemoteDescription() throws when not created', async () => {
    await expect(pc.setRemoteDescription({ type: 'offer', sdp: 'sdp' })).rejects.toThrow()
  })

  it('setRemoteDescription() works when created', async () => {
    pc.create(mockStream)
    await pc.setRemoteDescription({ type: 'offer', sdp: 'sdp' })
    expect(pc.connection!.setRemoteDescription).toHaveBeenCalled()
  })

  it('addIceCandidate() no-ops when not created', async () => {
    await expect(pc.addIceCandidate({ candidate: 't', sdpMLineIndex: 0 })).resolves.toBeUndefined()
  })

  it('addIceCandidate() no-ops without remote description', async () => {
    pc.create(mockStream)
    pc.connection!.currentRemoteDescription = null
    await expect(pc.addIceCandidate({ candidate: 't', sdpMLineIndex: 0 })).resolves.toBeUndefined()
  })

  it('addIceCandidate() delegates when remote desc set', async () => {
    pc.create(mockStream)
    pc.connection!.currentRemoteDescription = {} as RTCSessionDescription
    await pc.addIceCandidate({ candidate: 't', sdpMLineIndex: 0 })
    expect(pc.connection!.addIceCandidate).toHaveBeenCalled()
  })

  it('getState() returns closed when no connection', () => {
    expect(pc.getState()).toBe('closed')
  })

  it('getState() returns connectionState when connected', () => {
    pc.create(mockStream)
    pc.connection!.connectionState = 'connected'
    expect(pc.getState()).toBe('connected')
  })

  it('close() clears connection', () => {
    pc.create(mockStream)
    pc.close()
    expect(pc.connection).toBeNull()
  })

  it('close() is no-op on null connection', () => {
    expect(() => pc.close()).not.toThrow()
  })
})
