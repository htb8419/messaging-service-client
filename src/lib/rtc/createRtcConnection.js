import createAudioElement from "./createAudioElement";
import removeAudioElement from "./removeAudioElement";

const WEBRTC_ICE_CONFIGURATION = {
    "iceServers": [{"urls": "stun:turn.demisco.com:5349"},
        {
            "urls": "turn:turn.demisco.com:5349",
            "credential": "turn",
            "username": "turn"
        }]
}
const WEBRTC_MEDIA_STREAM_CONSTRAINTS = {
    'video':false,
    'audio': {
        echoCancellation: true,
        noiseSuppression: true,
    }
}

function createRtcConnection(onConnectionStateChange, onIceCandidate) {
    let rtcConnection = new RTCPeerConnection(WEBRTC_ICE_CONFIGURATION)
    let audioElement = createAudioElement()
    const setUserMedia = (stream) => {
        rtcConnection.onicecandidate = ({candidate}) => {
            if (candidate) {
                onIceCandidate.call(null, candidate)
            }
        }
        rtcConnection.addEventListener('track', ({track}) => {
            let mediaStream = new MediaStream()
            mediaStream.addTrack(track)
            audioElement.srcObject = mediaStream

        })
        //document.getElementById('localVideo').srcObject = stream
        let mediaStreamTracks = stream.getAudioTracks();
        if (!mediaStreamTracks || mediaStreamTracks.length < 1) {
            throw new Error('call error')
        }
        rtcConnection.onconnectionstatechange = onConnectionStateChange
        return rtcConnection.addTrack(mediaStreamTracks[0], stream)
    }
    return navigator.mediaDevices.getUserMedia(WEBRTC_MEDIA_STREAM_CONSTRAINTS).then(stream => {
        let rtcRtpSender = setUserMedia(stream)
        rtcConnection.onclose = () => {
            removeAudioElement()
            rtcConnection.removeTrack(rtcRtpSender)
        }
        return rtcConnection
    })
}

export default createRtcConnection