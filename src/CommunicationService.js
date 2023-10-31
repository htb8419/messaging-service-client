import WebRtcConnection from "./lib/rtc/WebRtcConnection";
import {CustomEventDispatcher} from "./lib";
import MessagingEnums from "./model/MessagingEnums";
import sleep from "./lib/sleep.js";

class CommunicationService {

    constructor(messageService, roomId) {
        this.messageService = messageService
        this.roomId = roomId
        CustomEventDispatcher.registerEventListener(MessagingEnums.ApplicationEvents.CONNECTION_STATE_CHANGE, this.handleAppEvents)
        CustomEventDispatcher.registerEventListener(MessagingEnums.ApplicationEvents.RECEIVED_MESSAGE, this.handleAppEvents)
        CustomEventDispatcher.registerEventListener(MessagingEnums.webRtcEvents.END_CALL, this.handleAppEvents)
        this.webRtc = null;
    }

    makeCall = () => {
        this.getWebRtc().then((webRtc) => {
            let delayCall = this.calcDelayCall();
            sleep(delayCall).then(() => webRtc.sendOffer())
        })
    }

    calcDelayCall = () => {
        const WAITING_NEXT_CALL = 6000
        let delayToCall = 0, diff = 0;
        if (window.lastCallingTime && (diff = Date.now() - window.lastCallingTime) < WAITING_NEXT_CALL) {
            delayToCall = WAITING_NEXT_CALL - diff
        }
        return delayToCall;
    }

    endCall = () => {
        this.getWebRtc().then(webRtc => {
            this.closeRtcConnection()
            this.sendEventMessage(MessagingEnums.webRtcEvents.END_CALL, {})
        })
    }
    closeRtcConnection = () => {
        this.getWebRtc().then(webRtc => webRtc.closeConnection())
    }

    sendEventMessage = (state, rtcObject) => {
        this.messageService.buildEventMessage(this.roomId, 'WRTC', {
            state,
            rtcObject
        }).then(this.messageService.sendMessage)
    }
    /**
     * Handle Events
     * */
    handleAppEvents = ({type: eventType, detail}) => {
        if (eventType === MessagingEnums.ApplicationEvents.CONNECTION_STATE_CHANGE) {
            let {connected} = detail
            if (connected) {
            }
        } else if (eventType === MessagingEnums.ApplicationEvents.RECEIVED_MESSAGE) {
            let {message} = detail
            if (message.messageType === 'EVENT') {
                if (message.state && MessagingEnums.webRtcEvents.hasOwnProperty(message.state)) {
                    this.handleRtcEvents(message.state, message.rtcObject)
                }
            }
        }
    }
    handleRtcEvents = (eventType, rtcObject) => {
        switch (eventType) {
            case MessagingEnums.webRtcEvents.OFFER:
                this.getWebRtc().then(webRtc => webRtc.onOffer(rtcObject))
                break
            case MessagingEnums.webRtcEvents.ANSWER:
                this.getWebRtc().then(webRtc => webRtc.onAnswer(rtcObject))
                break
            case MessagingEnums.webRtcEvents.CANDIDATE:
                this.getWebRtc().then(webRtc => webRtc.onRTCIceCandidate(rtcObject))
                break
            case MessagingEnums.webRtcEvents.END_CALL:
                this.closeRtcConnection()
                break
        }
    }

    getWebRtc = async () => {
        return new Promise(resolve => {
            if (this.webRtc === null) {
                this.webRtc = new WebRtcConnection(this.sendEventMessage)
            }
            resolve(this.webRtc)
        }).then(webRtc => {
            if (webRtc.isClosedConnectionState()) {
                return this.webRtc.initialRtcConnection()
            }
            return this.webRtc
        })
    }
}

export default CommunicationService