import ApplicationConfig from "../../ApplicationConfig";

const createAudioElement = () => {
    let {audioElementId}=ApplicationConfig.getConfig()
    let audioElement = document.getElementById(audioElementId)
    if (audioElement) {
        return audioElement
    }
    audioElement = document.createElement('audio')
    audioElement.setAttribute('id', audioElementId)
    audioElement.setAttribute('autoplay', 'true')
    audioElement.setAttribute('controls', 'true')
    audioElement.setAttribute('hidden', 'true')
    document.body.appendChild(audioElement)
    return audioElement
}
export default createAudioElement