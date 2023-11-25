import {CustomEventDispatcher, FileUploader, MessageBuilder} from "./lib"
import MessageChanel from "./MessageChanel"
import MessagingEnums from "./model/MessagingEnums";
import ApplicationConfig from "./ApplicationConfig";
import SecurityContextHolder from "./lib/SecurityContextHolder.js";

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
        this.applicationEventMap.set("CALL_STATE_CHANGE", applicationEvents.CALL_STATE_CHANGE)

        CustomEventDispatcher.registerEventListener(applicationEvents.CALL_STATE_CHANGE, this.handleAppEvents)
        CustomEventDispatcher.registerEventListener(applicationEvents.RECEIVED_MESSAGE, this.handleAppEvents)
        CustomEventDispatcher.registerEventListener(applicationEvents.CONNECTION_STATE_CHANGE, this.handleAppEvents)
        CustomEventDispatcher.registerEventListener(applicationEvents.THROW_EXCEPTION, this.handleAppEvents)
        this.connect()
    }

    connect = () => {
        let retryCount = 0
        let maxAttempts = 5;
        let reconnectDelay = 3000;
        let {socketUrl} = ApplicationConfig.getConfig()
        let {accessToken, sessionId} = SecurityContextHolder.getCurrentContext()
        const brokerURL = `${socketUrl}/websocket?access_token=${accessToken}&sid=${sessionId}`

        const createStompClient = () => {
            const onConnectionStateChange = (state) => {
                CustomEventDispatcher.dispatchEvent(MessagingEnums.ApplicationEvents.CONNECTION_STATE_CHANGE, {
                    state
                })
            }
            const connectCallback = () => {
                onConnectionStateChange(MessagingEnums.ConnectionStates.CONNECTED)
            }
            const errorCallback = () => {
                if (retryCount < maxAttempts) {
                    retryCount++
                    setTimeout(createStompClient, reconnectDelay)
                } else {
                    onConnectionStateChange(MessagingEnums.ConnectionStates.DISCONNECTED)
                }
            }
            console.debug('try connect to server, retryCount=', retryCount, ' maxAttempts=', maxAttempts)
            let stompClient = window.Stomp.client(brokerURL)
            stompClient.debug = (msg) => {
                console.debug("$stompClient: ", msg)
            }
            /*
            stompClient.subscribe(`/user/${sessionId}/queue/im`, this.messageHandler, {'ack': 'client'})
            stompClient.subscribe(`/user/${sessionId}/queue/event`,this.messageHandler, {'ack': 'client'})
            */
            onConnectionStateChange(MessagingEnums.ConnectionStates.CONNECTING)
            stompClient.connect({"heart-beat": "20000,20000"}, connectCallback, errorCallback)
            this.stompClient = stompClient
        }
        createStompClient()
    }
    messageHandler = (msg) => {
        msg.ack()
        let payload = JSON.parse(msg.body)
        CustomEventDispatcher.dispatchEvent(MessagingEnums.ApplicationEvents.RECEIVED_MESSAGE, {isMessageOut: false, ...payload})
    }
    disconnect = () => {
    }

    buildEventMessage = (roomId, eventType, payload) => {
        return this.messageBuilder.eventMessage(roomId, eventType, payload)
    }
    buildTextMessage = (roomId, text) => {
        return this.messageBuilder.instantMessage(roomId, text)
    }
    buildFileMessage = async (roomId, fileItem) => {
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
        //console.debug(`eventType=${eventType}, detail=`,detail)
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
            let {state} = detail
            if (state === 'CONNECTED') {
                this.messageSender = new MessageChanel(this.stompClient)
                this.changePresenceState(window.$imRoomInfo.roomId, MessagingEnums.UserPresenceState.ONLINE)
            }
            appEventDetail = {connected: state === 'CONNECTED', state}
        } else if (eventType === MessagingEnums.ApplicationEvents.THROW_EXCEPTION
            || eventType === MessagingEnums.ApplicationEvents.CALL_STATE_CHANGE) {
            appEventDetail = detail
        }
        let applicationEvent = this.applicationEventMap.get(eventType)
        if (applicationEvent && appEventDetail) {
            this.callback(applicationEvent, appEventDetail)
        }
    }
}


export default MessageService