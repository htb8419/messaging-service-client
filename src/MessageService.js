import {CustomEventDispatcher, FileUploader, MessageBuilder} from "./lib"
import MessageChanel from "./MessageChanel"
import SocketConnection from "./SocketConnection"
import MessagingEnums from "./model/MessagingEnums";

class MessageService {
    static $WEB_RTC_EVENTS = ['OFFER', 'ANSWER', 'CANDIDATE', 'END_CALL'];

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
        if (!roomId) {
            throw new Error('roomId is null!')
        }
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

    //#-------------------- Handle Events --------------------#//
    handleAppEvents = ({type: eventType, detail}) => {
        console.log('event : ',eventType," detail > ",detail)
        let appEventDetail = null;

        if (eventType === MessagingEnums.ApplicationEvents.CONNECTION_STATE_CHANGE) {
            let {stompClient, connected, state} = detail
            if (stompClient && connected) {
                this.messageSender = new MessageChanel(stompClient)
            }
            appEventDetail = {connected, state}
        } else if (eventType === MessagingEnums.ApplicationEvents.RECEIVED_MESSAGE) {
            let {message} = detail;
            appEventDetail = message
            if (message.messageType === 'EVENT') {
                if (message.state && MessagingEnums.webRtcEvents.hasOwnProperty(message.state)) {
                    console.log('ignored process rtc events.')
                    return;
                }
                eventType = message.type
            }
        }
        let applicationEvent = this.applicationEventMap.get(eventType)
        if (applicationEvent && appEventDetail) {
            this.callback(applicationEvent, appEventDetail)
        }
    }
}

export default MessageService