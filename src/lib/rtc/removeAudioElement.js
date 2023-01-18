import ApplicationConfig from "../../ApplicationConfig";

const removeAudioElement = () => {
    let {audioElementId}=ApplicationConfig.getConfig()
    let audioElement = document.getElementById(audioElementId)
    if (audioElement) {
        let stream = audioElement.srcObject
        if (stream && stream.getTracks()) {
            stream.getTracks().forEach(track => track.stop())
            stream = null
        }
        audioElement.pause()
        audioElement.srcObject = null
        document.body.removeChild(audioElement)
    }
}

export default removeAudioElement