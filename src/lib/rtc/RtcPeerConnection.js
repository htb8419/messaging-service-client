import {getConnectedMediaDevices} from './RtcUtils'
import CustomEventDispatcher from "../CustomEventDispatcher"
import {MessagingEnums} from "../../model/index.js"
import ApplicationConfig from "../../ApplicationConfig.js"

let rtcConnection = null
let localMediaStream = null
let _localVideoPlayPromise = null
let webRtcConnectionTimeout = null
let webRtcAutoReconnect = 0
let webRtcCallee = false;

const closeRtcPeerConnection = () => {
    console.debug('closeRtcPeerConnection')
    const WEB_RTC_HTML_ELEMENTS = ['video#remoteVideo', 'video#localVideo']
    WEB_RTC_HTML_ELEMENTS.forEach(selector => {
        let element = document.querySelector(selector)
        if (element && element.srcObject) {
            if (!element.paused) {
                element.pause()
            }
            stopMediaStreamTracks(element.srcObject)
            element.srcObject = null
        }
    })
    stopMediaStreamTracks(localMediaStream)
    localMediaStream = null

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
    }
    webRtcCallee = false
}

const createRtcConnection = () => {
    if (rtcConnection) {
        alert("rtcConnection is exists.")
        throw new Error("rtcConnection is exists.")
    }
    let webRtcConfig = ApplicationConfig.getWebRtcConfig()
    rtcConnection = new RTCPeerConnection(webRtcConfig.rtcConfig)
    rtcConnection.onicecandidate = ({candidate}) => {
        if (candidate) {
            sendRtcEvent('CANDIDATE', candidate)
        }
    }
    rtcConnection.addEventListener('track', ({track, streams}) => {
        let remoteElement = document.getElementById('remoteVideo')
        if (remoteElement.srcObject === streams[0]) {
            remoteElement.srcObject.addTrack(track)
        } else {
            remoteElement.srcObject = streams[0]
        }
    })
    rtcConnection.onconnectionstatechange = () => {
        let connectionState = rtcConnection.connectionState
        switch (connectionState) {
            case "connected":
                stopWebRtcReconnect()
                webRtcAutoReconnect = 0
                break
            case "disconnected":
            case "failed":
            case "closed":
                connectionState = 'closed'
                communicationClient.endCall()
                break;
        }
        publishRtcConnectionState(connectionState)
    }
}

const initRtcPeerConnection = async () => {
    console.debug('initRtcPeerConnection')
    closeRtcPeerConnection()
    createRtcConnection()
    return getUserMediaDevices().then(mediaStream => {
        let mediaStreamTracks = mediaStream.getTracks();
        if (!mediaStreamTracks || mediaStreamTracks.length < 1) {
            throw new Error('call error')
        }
        for (const track of mediaStreamTracks) {
            rtcConnection.addTrack(track, mediaStream)
        }
        localMediaStream = mediaStream
        let localElement = document.querySelector('video#localVideo')
        localElement.srcObject = mediaStream
        return rtcConnection
    }).catch(handleRtcErrors)
}

function sendOffer() {
    rtcConnection.createOffer({
        iceRestart: true,
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
    }).then(offer => {
        rtcConnection.setLocalDescription(offer).then(() => {
            sendRtcEvent('OFFER', offer)
            if (webRtcAutoReconnect < 2) {
                webRtcConnectionTimeout = setTimeout(webRtcReconnect, 3000)
            }
        })
    }).catch(handleRtcErrors)
}

function onOffer(offer) {
    rtcConnection.setRemoteDescription(new RTCSessionDescription(offer))
        .then(() => {
            rtcConnection.createAnswer().then((answer) => {
                rtcConnection.setLocalDescription(answer).then(() => sendRtcEvent('ANSWER', answer))
            }).catch(handleRtcErrors)
        }).catch(handleRtcErrors)
}

function onRTCIceCandidate(iceCandidate) {
    if (iceCandidate && rtcConnection && rtcConnection.currentRemoteDescription) {
        rtcConnection.addIceCandidate(new RTCIceCandidate(iceCandidate)).catch(handleRtcErrors)
    }
}

function onAnswer(answer) {
    rtcConnection.setRemoteDescription(new RTCSessionDescription(answer))
}

const handleRtcEvents = (eventType, rtcObject) => {
    console.debug('webRtcEvents=', eventType
        , ' signalingState=', (rtcConnection && rtcConnection.signalingState)
        , ' connectionState=', (rtcConnection && rtcConnection.connectionState)
        , ' iceConnectionState=', (rtcConnection && rtcConnection.iceConnectionState)
    )
    switch (eventType) {
        case 'CALL_REQUEST':
            webRtcCallee = true
            initRtcPeerConnection().then(() => {
                sendRtcEvent('CALL_ACCEPTED', {})
            })
            break
        case 'CALL_ACCEPTED': {
            sendOffer()
            break
        }
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
            if (rtcObject && rtcObject.forceCloseSession) {
                publishRtcConnectionState('END_CALL')
            }
            break
    }
}

function playLocalVideo() {
    let localVideo = getLocalVideo()
    if (localVideo.srcObject) {
        if(localVideo.paused){
            _localVideoPlayPromise = localVideo.play()
        }
        toggleEnabledVideoStream(localVideo.srcObject, true)
    }
}

function pauseLocalVideo() {
    let localVideo = getLocalVideo()
    if (_localVideoPlayPromise) {
        _localVideoPlayPromise.finally(() => {
            toggleEnabledVideoStream(localVideo.srcObject, false)
            localVideo.pause()
            _localVideoPlayPromise = null
        })
    } else {
        toggleEnabledVideoStream(localVideo.srcObject, false)
        localVideo.pause()
    }
}

function toggleEnabledVideoStream(stream, enabled) {
    stream.getTracks().forEach(t => {
        console.debug('track.kind >>', t.kind)
        if (t.kind === 'video') {
            t.enabled = enabled
        }
    });
}

function stopMediaStreamTracks(mediaStream) {
    if (!mediaStream) {
        return
    }
    mediaStream.getTracks().forEach(track => {
        track.stop()
    })
}

function canStartRtcCall() {
    if (webRtcCallee) {
        return false
    }
    return rtcConnection === null ||
        (rtcConnection.signalingState === 'stable' && rtcConnection.connectionState === 'new')
}

const getLocalVideo = () => {
    return document.querySelector('video#localVideo')
}

function sendRtcEvent(state, rtcObject) {
    communicationClient.sendRtcEvent(state, rtcObject)
}

function publishRtcConnectionState(connectionState) {
    console.debug('call_state_changed >> ', connectionState
        , ' signalingState=', (rtcConnection && rtcConnection.signalingState)
        , ' connectionState=', (rtcConnection && rtcConnection.connectionState)
        , ' iceConnectionState=', (rtcConnection && rtcConnection.iceConnectionState))
    CustomEventDispatcher.dispatchEvent(MessagingEnums.ApplicationEvents.CALL_STATE_CHANGE, {state: connectionState})
}

function webRtcReconnect() {
    stopWebRtcReconnect()
    communicationClient.endCall()
    if (webRtcAutoReconnect++ < 2) {
        communicationClient.makeCall()
    }
}

function stopWebRtcReconnect() {
    console.debug('stop rtcReconnect timeout, webRtcAutoReconnect=',webRtcAutoReconnect)
    if (webRtcConnectionTimeout) {
        clearTimeout(webRtcConnectionTimeout)
        webRtcConnectionTimeout = null
    }
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

async function getUserMediaDevices() {
    let webRtcConfig = ApplicationConfig.getWebRtcConfig()
    return getConnectedMediaDevices(webRtcConfig.mediaStreamConstraints)
        .then(connectedMediaDevices => navigator.mediaDevices.getUserMedia(connectedMediaDevices))
}

export {
    initRtcPeerConnection,
    handleRtcEvents,
    closeRtcPeerConnection,
    playLocalVideo,
    pauseLocalVideo,
    canStartRtcCall
}