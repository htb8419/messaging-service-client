import {getConnectedMediaDevices} from './RtcUtils'
import CustomEventDispatcher from "../CustomEventDispatcher"
import {MessagingEnums} from "../../model/index.js"
import ApplicationConfig from "../../ApplicationConfig.js"

let rtcConnection = null
let localMediaStream = null
let _localVideoPlayPromise = null

const closeRtcPeerConnection = () => {
    const WEB_RTC_HTML_ELEMENTS = ['video#remoteVideo', 'video#localVideo']
    WEB_RTC_HTML_ELEMENTS.forEach(selector => {
        let element = document.querySelector(selector)
        if (element.srcObject) {
            console.debug('selector =', selector, ' stopping stream tracks')
            element.srcObject.getTracks().forEach(track => track.stop())
            if (!element.paused) {
                element.pause()
            }
            element.srcObject = null
        }
    })
    if (localMediaStream) {
        localMediaStream.getTracks().forEach(track => track.stop());
        localMediaStream = null
    }
    if (rtcConnection) {
        // Stop all transceivers on the connection
        rtcConnection.getTransceivers().forEach(transceiver => {
            transceiver.stop();
        });
        rtcConnection.ontrack = null;
        rtcConnection.onnicecandidate = null;
        rtcConnection.oniceconnectionstatechange = null;
        rtcConnection.onsignalingstatechange = null;
        rtcConnection.onicegatheringstatechange = null;
        rtcConnection.onnotificationneeded = null;

        rtcConnection.close()
        rtcConnection = null
        console.debug('rtcConnection closed.')
    }
}

const createRtcConnection = () => {
    console.debug('create new RtcPeerConnection')
    if (rtcConnection) {
        alert("rtcConnection is exists.")
        throw new Error("rtcConnection is exists.")
    }
    let webRtcConfig = ApplicationConfig.getWebRtcConfig()
    let newConnection = new RTCPeerConnection(webRtcConfig.rtcConfig)
    newConnection.onicecandidate = ({candidate}) => {
        if (candidate) {
            communicationService.sendRtcEvent('CANDIDATE', candidate)
        }
    }
    newConnection.addEventListener('track', (e) => {
        let remoteVideo = document.querySelector('video#remoteVideo')
        remoteVideo.srcObject = e.streams[0]
    }, false)
    newConnection.onsignalingstatechange = (event) => {
        console.debug("onsignalingstatechange >> ", event.target.signalingState);
        switch (event.target.signalingState) {
            case "stable":
                console.debug("ICE negotiation complete")
                break;
        }
    }
    newConnection.onconnectionstatechange = (event) => {
        let connectionState = event.target.connectionState
        switch (connectionState) {
            case "disconnected":
            case "failed":
            case "closed":
                connectionState = 'closed'
                communicationService.endCall()
                break;
        }
        publishRtcConnectionState(connectionState)
    }
    return newConnection
}

const initRtcPeerConnection = async () => {
    console.debug('initRtcPeerConnection')
    closeRtcPeerConnection()
    rtcConnection = createRtcConnection()
    let webRtcConfig = ApplicationConfig.getWebRtcConfig()
    const connectedMediaDevices = await getConnectedMediaDevices(webRtcConfig.mediaStreamConstraints);
    return navigator.mediaDevices.getUserMedia(connectedMediaDevices).then(mediaStream => {
        localMediaStream = mediaStream
        let localElement = document.querySelector('video#localVideo')
        localElement.srcObject = mediaStream
        let mediaStreamTracks = mediaStream.getTracks();
        if (!mediaStreamTracks || mediaStreamTracks.length < 1) {
            throw new Error('call error')
        }
        for (const track of mediaStreamTracks) {
            rtcConnection.addTrack(track, mediaStream)
        }
        return rtcConnection
    }).catch(handleRtcErrors)
}

function sendOffer() {
    console.debug('signalingState, sendOffer >>', rtcConnection.signalingState)
    let webRtcConfig = ApplicationConfig.getWebRtcConfig()
    rtcConnection.createOffer(webRtcConfig.offerOptions).then(offer => {
        rtcConnection.setLocalDescription(offer).then(() => sendRtcEvent('OFFER', offer))
    }).catch(handleRtcErrors)
}

function onOffer(offer) {
    console.debug('signalingState, onOffer >>', rtcConnection.signalingState)
    rtcConnection.setRemoteDescription(new RTCSessionDescription(offer))
        .then(() => {
            rtcConnection.createAnswer().then((answer) => {
                console.debug('signalingState, createdAnswer >>', rtcConnection.signalingState)
                rtcConnection.setLocalDescription(answer).then(() => sendRtcEvent('ANSWER', answer))
            }).catch(handleRtcErrors)
        }).catch(handleRtcErrors)
}

function onRTCIceCandidate(iceCandidate) {
    console.debug('signalingState, onRTCIceCandidate >>', rtcConnection.signalingState)
    if (iceCandidate && rtcConnection && rtcConnection.currentRemoteDescription) {
        rtcConnection.addIceCandidate(iceCandidate).catch(handleRtcErrors)
    }
}

function onAnswer(answer) {
    rtcConnection.setRemoteDescription(new RTCSessionDescription(answer))
}

const handleRtcEvents = (eventType, rtcObject) => {
    console.debug('handleRtcEvents >', eventType)
    switch (eventType) {
        case 'CALL_REQUEST':
            initRtcPeerConnection().then(() => {
                sendRtcEvent('CALL_ACCEPTED', {})
            })
            break
        case 'CALL_ACCEPTED':
            sendOffer()
            break
        case 'OFFER':
            onOffer(rtcObject)
            break
        case 'ANSWER':
            onAnswer(rtcObject)
            break
        case 'CANDIDATE':
            onRTCIceCandidate(rtcObject)
            break
        case 'END_CALL':
            closeRtcPeerConnection()
            break
    }
}

function playLocalVideo() {
    let localVideo = getLocalVideo()
    if (localVideo.srcObject && localVideo.paused) {
        _localVideoPlayPromise = localVideo.play()
    }
}

function pauseLocalVideo() {
    let localVideo = getLocalVideo()
    if (localVideo.paused) {
        return
    }
    if (_localVideoPlayPromise) {
        _localVideoPlayPromise.finally(() => {
            localVideo.pause()
            _localVideoPlayPromise = null
        })
    } else {
        localVideo.pause()
    }
}

const getLocalVideo = () => {
    return document.querySelector('video#localVideo')
}

function sendRtcEvent(state, rtcObject) {
    communicationService.sendRtcEvent(state, rtcObject)
}

function publishRtcConnectionState(connectionState) {
    console.debug('rtcConnection.state >> ', connectionState)
    CustomEventDispatcher.dispatchEvent(MessagingEnums.ApplicationEvents.CALL_STATE_CHANGE, connectionState)
}

const handleRtcErrors = error => {
    console.error('handleRtcErrors >>> ', error)
    let errorMessage;
    if (error.name && error.message) {
        errorMessage = error.name + ", details: " + error.message
    } else if (error.message) {
        errorMessage = error.message
    } else {
        errorMessage = error
    }

    CustomEventDispatcher.dispatchEvent(MessagingEnums.ApplicationEvents.THROW_EXCEPTION, {error: errorMessage})
}
export {
    initRtcPeerConnection,
    handleRtcEvents,
    closeRtcPeerConnection,
    playLocalVideo,
    pauseLocalVideo
}