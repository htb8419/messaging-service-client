import {MessagingEnums} from "../../model";
import initUserMediaDevices from "./initUserMediaDevices";
import handleRTCTrackEvent from "./handleRTCTrackEvent";
import ApplicationConfig from "../../ApplicationConfig";
import {getMediaStreamConstraints} from './RtcUtils'

const _DEFAULT_WEBRTC_MEDIA_CONSTRAINT = {

    'audio': {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 24000,
        suppressLocalAudioPlayback: true
    },
    selfBrowserSurface: "exclude",
    systemAudio: "exclude"

}

class WebRtcConnection {

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
        let {webRtc} = ApplicationConfig.getConfig()
        this.rtcConnection = new RTCPeerConnection(webRtc.serverConfiguration)

        let mediaStreamConstraints = await this.getMediaStreamConstraints()

        console.log('mediaStreamConstraints >>>', mediaStreamConstraints)
        await initUserMediaDevices(this.rtcConnection, mediaStreamConstraints)

        this.rtcConnection.addEventListener('icecandidate', this.sendCandidate)
        this.rtcConnection.addEventListener('connectionstatechange', this.onConnectionStateChange)
        this.rtcConnection.addEventListener('iceconnectionstatechange',this.onIceConnectionStateChange.bind(this))
        this.rtcConnection.addEventListener('track', handleRTCTrackEvent)
        this.rtcConnection.addEventListener('close', () => {
            console.log('rtcConnection.onclose---------------')
        })
    }
    onIceConnectionStateChange = (event) => {
        let iceConnectionState = this.rtcConnection.iceConnectionState;
        console.log('event.iceconnectionstatechange >>>', iceConnectionState, ' event:', event,)
        if (iceConnectionState === 'disconnected' || iceConnectionState === 'failed') {
            this.closeConnection()
        }
    }
    sendOffer = () => {
        this.rtcConnection.createOffer({iceRestart: true}).then(offer => {
            this.rtcConnection.setLocalDescription(offer)
            this.sendEventMessage(MessagingEnums.webRtcEvents.OFFER, offer)
        }).catch(this.handleError)
    }
    sendCandidate = ({candidate}) => {
        if (candidate) {
            this.sendEventMessage(MessagingEnums.webRtcEvents.CANDIDATE, candidate)
        }
    }
    onOffer = (offer) => {
        this.rtcConnection.setRemoteDescription(new RTCSessionDescription(offer))
            .then(() => {
                this.rtcConnection.createAnswer((answer) => {
                    this.rtcConnection.setLocalDescription(answer)
                    this.sendEventMessage(MessagingEnums.webRtcEvents.ANSWER, answer)
                }, this.handleError)
            }).catch(this.handleError)
    }
    onAnswer = (answer) => {
        this.rtcConnection.setRemoteDescription(new RTCSessionDescription(answer))
    }

    onRTCIceCandidate(iceCandidate) {
        if (iceCandidate && this.rtcConnection && this.rtcConnection.currentRemoteDescription) {
            this.rtcConnection.addIceCandidate(iceCandidate).catch(this.handleError)
        }
    }

    closeConnection = (force = false) => {
        console.log('closeRtcPeerConnection  >> ', new Date())
        if (this.rtcConnection) {
            this.rtcConnection.close()
            let localVideo = document.querySelector('video#localVideo');
            localVideo.pause()
            localVideo.srcObject = null
            let remoteVideo = document.querySelector('video#remoteVideo');
            remoteVideo.pause()
            remoteVideo.srcObject = null
            //this.rtcConnection = null;
        }
        if (!force) {

        }
    }
    getMediaStreamConstraints = async () => {
        return getMediaStreamConstraints(_DEFAULT_WEBRTC_MEDIA_CONSTRAINT);
    }

    onConnectionStateChange = (event) => {
        //TODO handle connectionStateChange
        console.log('WebRTC onconnectionstatechange', event, this.rtcConnection.connectionState)
        switch (this.rtcConnection.connectionState) {
            case "connected":
                break;
            case "disconnected":
                this.closeConnection(true)
                break;
            case "failed":
                this.closeConnection(true)
                break;
            case "closed":
                // window.chatService.endCall()
                break;
        }
    }

    handleError = error => {
        console.log('WebRTC errrrrrrrrrror > ', error)
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
