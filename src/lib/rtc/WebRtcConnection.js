import {MessagingEnums} from "../../model";
import initUserMediaDevices from "./initUserMediaDevices";
import handleRTCTrackEvent from "./handleRTCTrackEvent";
import ApplicationConfig from "../../ApplicationConfig";
import {getMediaStreamConstraints} from './RtcUtils'

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
        let rtcConnection = new RTCPeerConnection(webRtc.serverConfiguration)
        let mediaStreamConstraints = await this.getMediaStreamConstraints()

        console.log('mediaStreamConstraints >>>', mediaStreamConstraints)
        await initUserMediaDevices(rtcConnection, mediaStreamConstraints)

        rtcConnection.addEventListener('icecandidate', this.sendCandidate)
        rtcConnection.addEventListener('connectionstatechange', this.onConnectionStateChange)
        rtcConnection.addEventListener('track', handleRTCTrackEvent)
        rtcConnection.addEventListener('close', () => {
            console.log('rtcConnection.onclose---------------')
        })
        this.rtcConnection = rtcConnection
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
            /*   let localVideo = document.querySelector('video#localVideo');
               localVideo.pause()
               localVideo.srcObject = null
               let remoteVideo = document.querySelector('video#remoteVideo');
               remoteVideo.pause()
               remoteVideo.srcObject = null*/
            //removeAudioElement()
            this.rtcConnection.close()
            this.rtcConnection = null;
        }
        if (!force) {

        }
    }
    getMediaStreamConstraints = async () => {
        return getMediaStreamConstraints({
            'video': {
                width: {min: 256, ideal: 1280, max: 1920},
                height: {min:144 , ideal: 720, max: 1080}
            },
            'audio': {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 44100,
                suppressLocalAudioPlayback: true
            }
        });
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
                his.closeConnection(true)
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
