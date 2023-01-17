import WebRtcConnection from "./WebRtcConnection";
import {CustomEventDispatcher} from "./lib";
import MessagingEnums from "./model/MessagingEnums";

class VoiceService {

    constructor(messageService,roomId) {
        this.messageService = messageService
        CustomEventDispatcher.registerEventListener(MessagingEnums.ApplicationEvents.RECEIVED_MESSAGE, this.handleAppEvents)
        this.webRtcConnection = new WebRtcConnection(this.messageService,roomId);
        this.webRtcConnection.connect();
    }

    call = () => {
        this.webRtcConnection.sendOffer()
    }

    end = () => {
        this.webRtcConnection.closeConnection()
    }

    /**
     * Handle Events
     * */
    handleAppEvents = ({type: eventType, detail}) => {
        console.log('received rct events > ', eventType, {...detail})
        if (eventType === MessagingEnums.ApplicationEvents.CONNECTION_STATE_CHANGE) {
            let {connected} = detail
            if (connected) {
                this.createRtcConnection()
            }
        } else if (eventType === MessagingEnums.ApplicationEvents.RECEIVED_MESSAGE) {
            let {message} = detail
            if (message.messageType === 'EVENT') {
                if (message.state && MessagingEnums.webRtcEvents.hasOwnProperty(message.state)) {
                    console.log('received rct events')
                    this.webRtcConnection.handleRtcEvents(message.state, message.rtcObject)
                }
            }
        }
    }
}

export default VoiceService