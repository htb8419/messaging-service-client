import {MessagingEnums} from "../../model";
import handleRTCTrackEvent from "./handleRTCTrackEvent";
import ApplicationConfig from "../../ApplicationConfig";
import {getUserMediaDevices} from './RtcUtils'
import {CustomEventDispatcher} from "../index.js";
import logger from "../Logger.js";

const WEB_RTC_HTML_ELEMENTS = ['video#remoteVideo', 'audio#remoteAudio', 'video#localVideo']
const _DEFAULT_WEBRTC_MEDIA_CONSTRAINT = {
    'video': true,
    'audio': {
        echoCancellation: true,
        noiseSuppression: true
    }
}

class WebRtcConnection {

    constructor() {
        this.rtcConnection = null
    }

    initialRtcConnection = async () => {
        this.closeConnection()
        this.logConnectionState('WebRtcConnection.initialRtcConnection')
        return getUserMediaDevices(_DEFAULT_WEBRTC_MEDIA_CONSTRAINT)
            .then(userMediaStream => {

                this.rtcConnection = this.newRtcConnection()
                let mediaStreamTracks = userMediaStream.getTracks();
                if (!mediaStreamTracks || mediaStreamTracks.length < 1) {
                    return Promise.reject(new Error('userMedia is empty'))
                }
                /*
                let localElement = document.querySelector('video#localVideo')
                localElement.srcObject = userMediaStream*/
                //this.rtcConnection.addTrack(mediaStreamTracks[0], userMediaStream)
                for (const track of mediaStreamTracks) {
                    this.rtcConnection.addTrack(track, userMediaStream)
                }
                console.debug('rtcConnection initialized.')
                return this
            }).catch(ex => {
                console.error('Error accessing media devices.', ex);
            })
    }
    newRtcConnection = () => {
        let {webRtc: {rtcConfiguration}} = ApplicationConfig.getConfig()
        let rtcConnection = new RTCPeerConnection(rtcConfiguration)
        rtcConnection.addEventListener('track', handleRTCTrackEvent)
        rtcConnection.addEventListener('icecandidate', this.sendCandidate)
        rtcConnection.addEventListener('connectionstatechange', this.onConnectionStateChange)
        return rtcConnection;
    }
    sendOffer = () => {
        this.logConnectionState('sendOffer')
        if (this.isOpenConnectionState()) {
            return
        }
        this.rtcConnection.createOffer().then(offer => {
            this.rtcConnection.setLocalDescription(offer).then(() => {
                this.sendEventMessage(MessagingEnums.webRtcEvents.OFFER, offer)
            })
        }).catch(this.handleError)
    }
    sendCandidate = ({candidate}) => {
        this.logConnectionState('sendCandidate')
        if (candidate) {
            this.sendEventMessage(MessagingEnums.webRtcEvents.CANDIDATE, candidate)
        }
    }
    onOffer = (offer) => {
        if (this.isOpenConnectionState()) {
            return
        }
        this.rtcConnection.setRemoteDescription(new RTCSessionDescription(offer))
            .then(() => {
                this.rtcConnection.createAnswer().then((answer) => {
                    this.rtcConnection.setLocalDescription(answer)
                        .then(() => this.sendEventMessage(MessagingEnums.webRtcEvents.ANSWER, answer))
                })
            }).catch(this.handleError)
    }
    onAnswer = (answer) => {
        this.logConnectionState('onAnswer')
        this.rtcConnection.setRemoteDescription(new RTCSessionDescription(answer))
    }

    onRTCIceCandidate(iceCandidate) {
        if (iceCandidate && this.rtcConnection && this.rtcConnection.currentRemoteDescription) {
            this.rtcConnection.addIceCandidate(new RTCIceCandidate(iceCandidate)).catch(this.handleError)
        }
    }

    closeConnection = () => {
        this.logConnectionState('closeRtcPeerConnection')
        WEB_RTC_HTML_ELEMENTS.forEach(elementId => {
            let element = document.querySelector(elementId)
            if (element.srcObject) {
                element.pause()
                element.srcObject.getTracks().forEach(track => track && track.stop())
                element.srcObject = null
            }
        })
        if (this.rtcConnection) {
            this.rtcConnection.close()
            this.rtcConnection = null
            window.lastCallingTime = Date.now()
            console.debug('the rtcConnection closed.')
        }
    }
    onConnectionStateChange = (event) => {
        //TODO handle connectionStateChange
        this.logConnectionState('onConnectionStateChange')
        let connectionState = this.rtcConnection.connectionState;
        switch (connectionState) {
            case "connecting":
                break;
            case "connected":
                break;
            case "disconnected":
                window.communicationService.endCall()
                break;
            case "failed":
                window.communicationService.endCall()
                break;
            case "closed":
                //window.chatService.endCall()
                break;
        }
        this.publishApplicationEvent(MessagingEnums.ApplicationEvents.CALL_STATE_CHANGE, {
            state: connectionState
        })
    }

    handleError = error => {
        console.log('WebRTC err > ', error)
        this.logConnectionState('onRtcConnectionError')
        let errorMessage;
        if (error.name) {
            errorMessage = error.name
            if (!errorMessage) {
                errorMessage = error.name + ": " + error.message
            }
        } else {
            //errorMessage = I18nMessages.Error.internalServiceError
        }

        //Todo notify(errorMessage, 'error');
        //throw error
    }
    isClosedConnectionState = () => {
        let connectionState = this.getConnectionState();
        return connectionState === 'closed' || connectionState === 'failed'
    }
    isOpenConnectionState = () => {
        let connectionState = this.getConnectionState();
        return connectionState === 'connected' || connectionState === 'connecting'
    }
    getConnectionState = () => {
        let connectionState = 'closed'
        if (this.rtcConnection) {
            connectionState = this.rtcConnection.connectionState
        }
        return connectionState
    }
    logConnectionState = (method) => {
        logger.getLogger()(`${method}, rtcConnectionState [${this.getConnectionState()}]`)
    }
    publishApplicationEvent = (eventCode, detail) => {
        CustomEventDispatcher.dispatchEvent(eventCode, detail)
    }

    sendRtcEvent = (state, rtcObject) => {
        communicationService.sendRtcEvent(state, rtcObject)
    }

}

export default WebRtcConnection
