export class MediaManager {
  static async getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia(constraints)
  }

  static async getConnectedDevices(type: MediaDeviceKind): Promise<MediaDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter(d => d.kind === type)
  }

  static async existsConnectedDevices(type: MediaDeviceKind): Promise<boolean> {
    const devices = await MediaManager.getConnectedDevices(type)
    return devices.length > 0
  }

  static async getAvailableConstraints(
    requested: MediaStreamConstraints,
  ): Promise<MediaStreamConstraints> {
    const constraints: MediaStreamConstraints = { ...requested }

    if (constraints.video) {
      const hasVideo = await MediaManager.existsConnectedDevices('videoinput')
      if (!hasVideo) constraints.video = false
    }

    if (constraints.audio) {
      const hasAudio = await MediaManager.existsConnectedDevices('audioinput')
      if (!hasAudio) constraints.audio = false
    }

    return constraints
  }

  static toggleTrack(stream: MediaStream, kind: string, enabled: boolean): void {
    stream.getTracks().forEach(track => {
      if (track.kind === kind) {
        track.enabled = enabled
      }
    })
  }

  static stopAllTracks(stream: MediaStream | null): void {
    if (!stream) return
    stream.getTracks().forEach(track => track.stop())
  }
}
