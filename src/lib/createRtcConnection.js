const WEBRTC_ICE_CONFIGURATION = {
    "iceServers": [{"urls": "stun:turn.demisco.com:5349"},
        {
            "urls": "turn:turn.demisco.com:5349",
            "credential": "turn",
            "username": "turn"
        }]
}
const WEBRTC_MEDIA_STREAM_CONSTRAINTS = {
    'video': false,
    'audio': {
        echoCancellation: true,
        noiseSuppression: true,
    }
}
const WEBRTC_AUDIO_ELEMENT_ID = "web-rtc-audio"

const removeAudioElement = () => {
    let audioElement = document.getElementById(WEBRTC_AUDIO_ELEMENT_ID)
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
const createAudioElement = () => {
    removeAudioElement()
    let audioElement = document.createElement('audio')
    audioElement.setAttribute('id', WEBRTC_AUDIO_ELEMENT_ID)
    audioElement.setAttribute('autoplay', 'true')
    audioElement.setAttribute('controls', 'true')
    audioElement.setAttribute('hidden', 'true')
    document.body.appendChild(audioElement)
    return audioElement
}

function createRtcConnection(onConnectionStateChange, onIceCandidate) {
    let rtcConnection = new RTCPeerConnection(WEBRTC_ICE_CONFIGURATION)

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
        let audioElement = createAudioElement()
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