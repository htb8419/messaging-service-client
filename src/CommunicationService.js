import {
    initRtcPeerConnection,
    handleRtcEvents,
    closeRtcPeerConnection
} from "./lib/rtc/RtcPeerConnection.js";
import {CustomEventDispatcher} from "./lib";
import MessagingEnums from "./model/MessagingEnums";

class CommunicationService {

    constructor(messageService, roomId) {
        this.messageService = messageService
        this.roomId = roomId
        CustomEventDispatcher.registerEventListener(MessagingEnums.ApplicationEvents.CONNECTION_STATE_CHANGE, this.handleAppEvents)
        CustomEventDispatcher.registerEventListener(MessagingEnums.ApplicationEvents.RECEIVED_MESSAGE, this.handleAppEvents)
        CustomEventDispatcher.registerEventListener(MessagingEnums.webRtcEvents.END_CALL, this.handleAppEvents)
        window.communicationService = this
    }

    makeCall = () => {
        initRtcPeerConnection().then(() => {
            this.sendRtcEvent('CALL_REQUEST', {})
        })
    }

    endCall = () => {
        closeRtcPeerConnection()
        this.sendRtcEvent(MessagingEnums.webRtcEvents.END_CALL, {})
    }

    sendRtcEvent = (state, rtcObject) => {
        return this.sendEventMessage('WRTC', {
            state,
            rtcObject
        })
    }
    sendEventMessage = (eventType, payload) => {
        return this.messageService.buildEventMessage(this.roomId, eventType, payload).then(this.messageService.sendMessage)
    }
    /**
     * Handle Events
     * */
    handleAppEvents = ({type: eventType, detail}) => {
        if (eventType === MessagingEnums.ApplicationEvents.RECEIVED_MESSAGE) {
            let {message} = detail
            if (message.messageType === 'EVENT') {
                if (message.state && MessagingEnums.webRtcEvents.hasOwnProperty(message.state)) {
                    handleRtcEvents(message.state, message.rtcObject)
                }
            }
        }
    }
}

export default CommunicationService