import createRtcConnection from "./lib/createRtcConnection";
import {MessagingEnums} from "./model";
import {Logger} from "./lib";

const WebRTCCallStateCodes = {
    IDLE: 'IDLE',
    WAITING: 'WAITING',
    CALLING: 'CALLING',
    REJECTED: 'REJECTED'
}

//let rtcConnection = null, rtcRtpSender = null
class WebRtcConnection {

    constructor(messageService, roomId) {
        this.messageService = messageService
        this.roomId =roomId
        this.rtcConnection = null
    }

    connect = () => {
        // closeRtcPeerConnection(true)
        if (this.rtcConnection) {
            return this.rtcConnection
        }
        return createRtcConnection(this.onConnectionStateChange,
            (candidate) => {
                this.sendEventMessage(MessagingEnums.EventMessageTypes.WEBRTC_CANDIDATE, candidate)
            }).then(rtcConnection => {
            this.rtcConnection = rtcConnection
            console.log('rtcConnection >', rtcConnection)
        })
    }
    sendOffer = () => {
        this.rtcConnection.createOffer({iceRestart: true}).then(offer => {
            this.sendEventMessage(MessagingEnums.EventMessageTypes.WEBRTC_OFFER, offer)
            this.rtcConnection.setLocalDescription(offer)
        }).catch(this.handleError)
        //}).catch(error => {
        //Todo handleRtcErrors(error)
        // EventDispatcher.dispatchEvent(EventTypes.REJECT_VOICE_CALL, {})
        //})
    }
    onOffer = (offer) => {
        this.rtcConnection.setRemoteDescription(new RTCSessionDescription(offer))
            .then(() => {
                this.rtcConnection.createAnswer((answer) => {
                    this.sendEventMessage(MessagingEnums.EventMessageTypes.WEBRTC_ANSWER, answer)
                    this.rtcConnection.setLocalDescription(answer)
                }, this.handleError)
            }).catch(this.handleError)
    }

    onRTCIceCandidate(iceCandidate) {
        if (iceCandidate && this.rtcConnection && this.rtcConnection.currentRemoteDescription) {
            this.rtcConnection.addIceCandidate(new RTCIceCandidate(iceCandidate)).catch(this.handleError)
        }
    }
    sendEventMessage(event, payload) {
        this.messageService.buildEventMessage(this.roomId, 'WRTC', {
            state: event,
            rtcObject: payload
        }).then(this.messageService.sendMessage)
    }

    closeConnection = (force = false) => {
        console.log('closeRtcPeerConnection  >> ', new Date())
        if (this.rtcConnection) {
            this.rtcConnection.close()
            this.rtcConnection = null;
        }
        if (!force) {

        }
    }

    onConnectionStateChange = (event) => {
        //TODO handle connectionStateChange
        console.log('WebRTC onconnectionstatechange', event)
        switch (this.rtcConnection.connectionState) {
            case "connected":
                break;
            case "disconnected":
                // window.chatService.endCall()
                break;
            case "failed":
                //window.chatService.endCall()
                break;
            case "closed":
                // window.chatService.endCall()
                break;
        }
    }
    handleRtcEvents = (eventType, rtcObject) => {
        console.log('webRtcConnection.handleAppEvents >> [', eventType, '], rtcObject >>', rtcObject)
        switch (eventType) {
            case MessagingEnums.webRtcEvents.OFFER:
                this.onOffer(rtcObject)
                break
            case MessagingEnums.webRtcEvents.ANSWER:
                this.rtcConnection.setRemoteDescription(new RTCSessionDescription(rtcObject))
                break
            case MessagingEnums.webRtcEvents.CANDIDATE:
                this.onRTCIceCandidate(rtcObject)
                break
        }
    }

    handleError = error => {
        Logger.error('webRtc error >>', error)
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
}

export default WebRtcConnection
