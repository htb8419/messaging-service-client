import CustomEventDispatcher from "../CustomEventDispatcher";
import {ApplicationErrors, MessagingEnums} from "../../model";

const getWebRtcHtmlElements = (mediaStreamConstraints) => {
    let htmlElements = []
    if ('video' in mediaStreamConstraints) {
        let localVideoElement = document.querySelector('video#localVideo')
        if (localVideoElement) {
            htmlElements.push(localVideoElement)
        }
    }
    if ('audio' in mediaStreamConstraints) {
        let audioElement = document.querySelector('audio#localAudio')
        if (audioElement) {
            htmlElements.push(audioElement)
        }
    }
    return htmlElements
}
const initUserMediaDevices = async (rtcConnection, mediaStreamConstraints) => {
    try {

        let userMediaStream = await navigator.mediaDevices.getUserMedia(mediaStreamConstraints)

        let mediaStreamTracks = userMediaStream.getTracks();
        if (!mediaStreamTracks || mediaStreamTracks.length < 1) {
            return Promise.reject(new Error('userMedia is empty'))
        }
     /*   let localElement = document.querySelector('video#localVideo')
        localElement.srcObject = userMediaStream*/

        let htmlElements = getWebRtcHtmlElements(mediaStreamConstraints)
        htmlElements.forEach(element => element.srcObject = userMediaStream)


        let rtcRtpSender = []
        for (const track of mediaStreamTracks) {
            let ref = rtcConnection.addTrack(track, userMediaStream)
            rtcRtpSender.push(ref)
        }

        rtcConnection.addEventListener('close', () => {
            console.log('rtcConnection.onclose---------------')
            localElement.pause()
            localElement.srcObject = null
            rtcRtpSender.forEach(rtcConnection.removeTrack)
        })
        return userMediaStream
    } catch (ex) {
        console.error('Error accessing media devices.', ex);
        CustomEventDispatcher.dispatchEvent(MessagingEnums.ApplicationEvents.THROW_EXCEPTION, {error: ApplicationErrors.ERROR_ON_ACCESSING_MEDIA_DEVICES})
    }
}
export default initUserMediaDevices