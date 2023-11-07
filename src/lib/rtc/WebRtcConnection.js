import {MessagingEnums} from "../../model";
import initUserMediaDevices from "./initUserMediaDevices";
import handleRTCTrackEvent from "./handleRTCTrackEvent";
import ApplicationConfig from "../../ApplicationConfig";
import {getMediaStreamConstraints} from './RtcUtils'
import {CustomEventDispatcher} from "../index.js";
import logger from "../Logger.js";

const WEB_RTC_HTML_ELEMENTS = ['video#remoteVideo', 'audio#remoteAudio', 'video#localVideo', 'audio#localAudio',]
const _DEFAULT_WEBRTC_MEDIA_CONSTRAINT = {
    'video': true,
    'audio': {
        echoCancellation: true,
        noiseSuppression: true
    }
}

class WebRtcConnection {

    constructor(sendEventMessage) {
        this.sendEventMessage = sendEventMessage
        this.rtcConnection = null
    }

    initialRtcConnection = async () => {
        // closeRtcPeerConnection(true)
        this.logConnectionState('initialRtcConnection')
        let {webRtc} = ApplicationConfig.getConfig()
        this.rtcConnection = new RTCPeerConnection(webRtc.serverConfiguration)
        let mediaStreamConstraints = await this.getMediaStreamConstraints()
        await initUserMediaDevices(this.rtcConnection, mediaStreamConstraints)

        this.rtcConnection.addEventListener('icecandidate', this.sendCandidate)
        this.rtcConnection.addEventListener('connectionstatechange', this.onConnectionStateChange)
        this.rtcConnection.addEventListener('iceconnectionstatechange', this.onIceConnectionStateChange)
        this.rtcConnection.addEventListener('track', handleRTCTrackEvent)
        this.rtcConnection.addEventListener('close', () => {
            this.logConnectionState('rtcConnection.onclose')
        })
        return this
    }
    onIceConnectionStateChange = (event) => {
        this.logConnectionState('onIceConnectionStateChange')
        let iceConnectionState = this.rtcConnection.iceConnectionState;
        if (iceConnectionState === 'disconnected' || iceConnectionState === 'failed') {
            this.closeConnection()
        }
    }
    sendOffer = () => {
        this.logConnectionState('sendOffer')
        if (this.getConnectionState() !== 'new') {
            return
        }
        this.rtcConnection.createOffer({iceRestart: true}).then(offer => {
            this.rtcConnection.setLocalDescription(offer)
            this.sendEventMessage(MessagingEnums.webRtcEvents.OFFER, offer)
        }).catch(this.handleError)
    }
    sendCandidate = ({candidate}) => {
        this.logConnectionState('sendCandidate')
        if (candidate) {
            this.sendEventMessage(MessagingEnums.webRtcEvents.CANDIDATE, candidate)
        }
    }
    onOffer = (offer) => {
        this.logConnectionState('onOffer')
        if (this.getConnectionState() !== 'new') {
            return
        }
        this.rtcConnection.setRemoteDescription(new RTCSessionDescription(offer))
            .then(() => {
                this.rtcConnection.createAnswer((answer) => {
                    this.logConnectionState('createAnswer')
                    this.rtcConnection.setLocalDescription(answer)
                    this.sendEventMessage(MessagingEnums.webRtcEvents.ANSWER, answer)
                }, this.handleError)
            }).catch(this.handleError)
    }
    onAnswer = (answer) => {
        this.logConnectionState('onAnswer')
        this.rtcConnection.setRemoteDescription(new RTCSessionDescription(answer))
    }

    onRTCIceCandidate(iceCandidate) {
        this.logConnectionState('onRTCIceCandidate')
        if (iceCandidate && this.rtcConnection && this.rtcConnection.currentRemoteDescription) {
            this.rtcConnection.addIceCandidate(iceCandidate).catch(this.handleError)
        }
    }

    closeConnection = (force = false) => {
        this.logConnectionState('closeRtcPeerConnection')
        if (this.rtcConnection) {
            this.rtcConnection.close()
            WEB_RTC_HTML_ELEMENTS.forEach(elementId => {
                let element = document.querySelector(elementId)
                element.pause()
                if (element.srcObject && element.srcObject.getTracks) {
                    element.srcObject.getTracks().forEach(track => track && track.stop())
                }
                element.srcObject = null
            })
            window.lastCallingTime = Date.now()
            this.onConnectionStateChange()
            console.debug('the rtcConnection closed')
        }
        if (!force) {

        }
    }
    getMediaStreamConstraints = async () => {
        return getMediaStreamConstraints(_DEFAULT_WEBRTC_MEDIA_CONSTRAINT);
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
                this.closeConnection(true)
                break;
            case "failed":
                this.closeConnection(true)
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
        if (!this.rtcConnection) {
            return 'closed'
        }
        return this.rtcConnection.connectionState
    }
    logConnectionState = (method = 'm') => {
        logger.getLogger()(`${method}, rtcConnectionState [${this.getConnectionState()}]`)
    }
    publishApplicationEvent = (eventCode, detail) => {
        CustomEventDispatcher.dispatchEvent(eventCode, detail)
    }
}

export default WebRtcConnection
