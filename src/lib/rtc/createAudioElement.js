import ApplicationConfig from "../../ApplicationConfig";

const createAudioElement = () => {
    let {webRtc}=ApplicationConfig.getConfig()
    let audioElement = document.querySelector('audio#webrtc-audio')
    if (audioElement) {
        return audioElement
    }
    audioElement = document.createElement('audio')
    audioElement.setAttribute('id', 'webrtc-audio')
    audioElement.setAttribute('autoplay', 'true')
    audioElement.setAttribute('controls', 'true')
    audioElement.setAttribute('hidden', 'true')
    audioElement.setAttribute('muted', 'true')
    document.body.appendChild(audioElement)
    return audioElement
}
export default createAudioElement