import {CustomEventDispatcher, FileUploader, MessageBuilder} from "./lib"
import MessageChanel from "./MessageChanel"
import SocketConnection from "./SocketConnection"
import WebRtcConnection from "./WebRtcConnection";
import MessagingEnums from "./model/MessagingEnums";

class MessageService {

    constructor(callback) {
        this.callback = callback
        this.messageBuilder = new MessageBuilder();
        CustomEventDispatcher.registerEventListener(MessagingEnums.ApplicationEvents.RECEIVED_MESSAGE, this.handleAppEvents)
        CustomEventDispatcher.registerEventListener(MessagingEnums.ApplicationEvents.CONNECTION_STATE_CHANGE, this.handleAppEvents)
        this.applicationEventMap = new Map();
        this.applicationEventMap.set("CONNECTION_STATE_CHANGE", MessagingEnums.ApplicationEvents.CONNECTION_STATE_CHANGE)
        this.applicationEventMap.set("RECEIVED_MESSAGE", MessagingEnums.ApplicationEvents.RECEIVED_MESSAGE)
        this.applicationEventMap.set("DELIVERY", MessagingEnums.ApplicationEvents.MESSAGE_DELIVERY)
        this.applicationEventMap.set("TYPING", MessagingEnums.ApplicationEvents.TYPING_STATE_CHANGE)
        this.applicationEventMap.set("PRESENCE", MessagingEnums.ApplicationEvents.PRESENCE_STATE_CHANGE)
    }

    getOnlineAgents = () => {
        return Promise.resolve([{agentNickname: 'test', agentProfileImage: 'image'}]) //XhrRequest.GET("/onlineAgents")
    }

    connect = () => {
        new SocketConnection().connect()
    }
    disconnect = () => {

    }

    buildEventMessage = (roomId, eventType, payload) => {
        return this.messageBuilder.eventMessage(roomId, eventType, payload)
    }
    buildTextMessage = (roomId, text) => {
        return this.messageBuilder.instantMessage(roomId, text)
    }
    buildFileMessage = (roomId, fileItem) => {
        return FileUploader.upload(fileItem).then(fileInfo => {
            return this.messageBuilder.instantMessage(roomId, null, fileInfo)
        })
    }
    sendMessage = (message) => {
        this.messageSender.send(message)
    }

    call = (roomId) => {
        this.webRtcConnection = new WebRtcConnection(this, roomId);
        this.webRtcConnection.connect().then(() => {
            this.handleAppEvents({
                type: MessagingEnums.ApplicationEvents.CALL_STATE_CHANGE,
                detail: {state: MessagingEnums.VoiceCallStates.CONNECTING}
            })
            this.buildEventMessage(roomId, MessagingEnums.EventMessageTypes.WEBRTC_CONNECTION_REQUEST, {})
                .then(this.sendMessage)
            //this.webRtcConnection.sendOffer()
        })
    }

    //#-------------------- Handle Events --------------------#//
    handleAppEvents = ({type: eventType, detail}) => {
        let appEventDetail = null;
        console.log('handle event [', eventType, '], detail >>', detail)

        if (eventType === MessagingEnums.ApplicationEvents.RECEIVED_MESSAGE) {
            let {message} = detail;
            appEventDetail = message
            if (message.messageType === 'EVENT') {
                eventType = message.type;
                if (this.webRtcConnection) {
                    this.webRtcConnection.handleEvents(eventType, detail)
                }
            } else {
                //this.onReceivedMessage(appEventDetail)
            }
        } else if (eventType === MessagingEnums.ApplicationEvents.CONNECTION_STATE_CHANGE) {
            let {stompClient, connected, state} = detail
            if (stompClient && connected) {
                this.messageSender = new MessageChanel(stompClient)
            }
            appEventDetail = {connected, state}
        }
        let applicationEvent = this.applicationEventMap.get(eventType)
        if (applicationEvent && appEventDetail) {
            this.callback(applicationEvent, appEventDetail)
        }
    }
    /*
    //adapter send delivery
    onReceivedMessage = ({clientMessageId, room}) => {
         let payload = {
             clientMessageId,
             'state': MessagingEnums.DeliveryStatus.CLIENT_DELIVERY
         }
         this.buildEventMessage(room, MessagingEnums.EventMessageTypes.MESSAGE_DELIVERY, payload).then(this.sendMessage)
     }*/
}

export default MessageService