import ApplicationConfig from "../../ApplicationConfig";

const removeAudioElement = () => {
    let {webRtc}=ApplicationConfig.getConfig()
    let audioElement = document.getElementById('webrtc-audio')
    if (audioElement) {
        let stream = audioElement.srcObject
        if (stream && stream.getAudioTracks()) {
            stream.getAudioTracks().forEach(track => track.stop())
            stream = null
        }
        audioElement.pause()
        audioElement.srcObject = null
        document.body.removeChild(audioElement)
    }
}

export default removeAudioElement