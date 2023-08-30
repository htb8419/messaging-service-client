import WebRtcConnection from "./lib/rtc/WebRtcConnection";
import {CustomEventDispatcher} from "./lib";
import MessagingEnums from "./model/MessagingEnums";

class CommunicationService {

    constructor(messageService, roomId) {
        this.messageService=messageService
        this.roomId=roomId
        CustomEventDispatcher.registerEventListener(MessagingEnums.ApplicationEvents.RECEIVED_MESSAGE, this.handleAppEvents)
        this.webRtc = new WebRtcConnection(this.sendEventMessage.bind(this))

    }

    makeCall = () => {
        this.webRtc.sendOffer()
    }

    endCall = () => {
        this.webRtc.closeConnection()
    }

    sendEventMessage=(state, rtcObject)=> {
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
                this.webRtcConnection.initialRtcConnection()
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
                this.webRtc.onOffer(rtcObject)
                break
            case MessagingEnums.webRtcEvents.ANSWER:
                this.webRtc.onAnswer(rtcObject)
                break
            case MessagingEnums.webRtcEvents.CANDIDATE:
                this.webRtc.onRTCIceCandidate(rtcObject)
                break
        }
    }

}

export default CommunicationService