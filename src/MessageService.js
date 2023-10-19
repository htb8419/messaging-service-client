import {CustomEventDispatcher, FileUploader, MessageBuilder} from "./lib"
import MessageChanel from "./MessageChanel"
import SocketConnection from "./lib/SocketConnection"
import MessagingEnums from "./model/MessagingEnums";
import ApplicationConfig from "./ApplicationConfig";

class MessageService {

    constructor() {
        let {callback} = ApplicationConfig.getConfig()
        this.callback = callback
        this.messageBuilder = new MessageBuilder();
        this.initial()
    }

    initial = () => {
        let applicationEvents = MessagingEnums.ApplicationEvents;

        this.applicationEventMap = new Map();
        this.applicationEventMap.set("CONNECTION_STATE_CHANGE", applicationEvents.CONNECTION_STATE_CHANGE)
        this.applicationEventMap.set("RECEIVED_MESSAGE", applicationEvents.RECEIVED_MESSAGE)
        this.applicationEventMap.set("DELIVERY", applicationEvents.MESSAGE_DELIVERY)
        this.applicationEventMap.set("TYPING", applicationEvents.TYPING_STATE_CHANGE)
        this.applicationEventMap.set("PRESENCE", applicationEvents.PRESENCE_STATE_CHANGE)

        CustomEventDispatcher.registerEventListener(applicationEvents.RECEIVED_MESSAGE, this.handleAppEvents)
        CustomEventDispatcher.registerEventListener(applicationEvents.CONNECTION_STATE_CHANGE, this.handleAppEvents)
        CustomEventDispatcher.registerEventListener(applicationEvents.THROW_EXCEPTION, this.handleAppEvents)
        this.connect()
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

    changeTypingState = (roomId, state) => {
        if (MessagingEnums.typingState.hasOwnProperty(state)) {
            this.buildEventMessage(roomId, MessagingEnums.EventMessageTypes.TYPING_STATE,
                {state}).then(this.sendMessage)
        }
    }
    changePresenceState = (roomId, presence) => {
        this.buildEventMessage(roomId, MessagingEnums.EventMessageTypes.CHANGE_PRESENCE_STATUS, {presence})
            .then(this.sendMessage)
    }
    //---------------------- Handle Events ---------------------------------------//
    handleAppEvents = ({type: eventType, detail}) => {
        console.log('event : ', eventType, " detail > ", detail)
        let appEventDetail = null;
        if (eventType === MessagingEnums.ApplicationEvents.RECEIVED_MESSAGE) {
            let {message} = detail;
            appEventDetail = message
            if (message.messageType === 'EVENT') {
                if (message.state && MessagingEnums.webRtcEvents.hasOwnProperty(message.state)) {
                    return;
                }
                eventType = message.type
            }
        } else if (eventType === MessagingEnums.ApplicationEvents.CONNECTION_STATE_CHANGE) {
            let {stompClient, connected, state} = detail
            if (stompClient && connected) {
                this.messageSender = new MessageChanel(stompClient)
                this.changePresenceState(window.$roomInfo.roomId,MessagingEnums.UserPresenceState.ONLINE)
            }
            appEventDetail = {connected, state}
        } else if (eventType === MessagingEnums.ApplicationEvents.THROW_EXCEPTION) {
            appEventDetail = detail
        }
        let applicationEvent = this.applicationEventMap.get(eventType)
        if (applicationEvent && appEventDetail) {
            this.callback(applicationEvent, appEventDetail)
        }
    }
}

export default MessageService