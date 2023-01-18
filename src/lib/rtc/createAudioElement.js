import ApplicationConfig from "../../ApplicationConfig";
import removeAudioElement from "./removeAudioElement";

const createAudioElement = () => {
    let {audioElementId}=ApplicationConfig.getConfig()
    removeAudioElement()
    let audioElement = document.createElement('audio')
    audioElement.setAttribute('id', audioElementId)
    audioElement.setAttribute('autoplay', 'true')
    audioElement.setAttribute('controls', 'true')
    audioElement.setAttribute('hidden', 'true')
    document.body.appendChild(audioElement)
    return audioElement
}
export default createAudioElement