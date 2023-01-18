import createRtcConnection from "./createRtcConnection";
import {MessagingEnums} from "../../model";

class WebRtc {

    constructor(sendEventMessage) {
        this.sendEventMessage = sendEventMessage
        this.rtcConnection = null
        this.initialRtcConnection()
    }

    initialRtcConnection = async () => {
        // closeRtcPeerConnection(true)
        if (this.rtcConnection) {
            return this.rtcConnection
        }
        this.rtcConnection = await createRtcConnection(this.onConnectionStateChange, this.sendEventMessage.bind(this, MessagingEnums.webRtcEvents.CANDIDATE))
    }
    sendOffer = () => {
        this.rtcConnection.createOffer({iceRestart: true}).then(offer => {
            this.sendEventMessage(MessagingEnums.webRtcEvents.OFFER, offer)
            this.rtcConnection.setLocalDescription(offer)
        }).catch(this.handleError)
    }
    onOffer = (offer) => {
        this.rtcConnection.setRemoteDescription(new RTCSessionDescription(offer))
            .then(() => {
                this.rtcConnection.createAnswer((answer) => {
                    this.sendEventMessage(MessagingEnums.webRtcEvents.ANSWER, answer)
                    this.rtcConnection.setLocalDescription(answer)
                }, this.handleError)
            }).catch(this.handleError)
    }
    onAnswer = (answer) => {
        this.rtcConnection.setRemoteDescription(new RTCSessionDescription(answer))
    }

    onRTCIceCandidate(iceCandidate) {
        if (iceCandidate && this.rtcConnection && this.rtcConnection.currentRemoteDescription) {
            this.rtcConnection.addIceCandidate(new RTCIceCandidate(iceCandidate)).catch(this.handleError)
        }
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

    handleError = error => {
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

export default WebRtc
