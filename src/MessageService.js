import {CustomEventDispatcher, MessageBuilder} from "./lib"
import {MessagingEnums} from "./model";
import createStompClient from "./lib/createStompClient.js";
import SecurityContextHolder from "./lib/SecurityContextHolder.js";
import uploadFile from "./lib/uploadFile.js";

class MessageService {

    constructor() {
        this.messageBuilder = new MessageBuilder();
        createStompClient(this.connectionStateChangeCallback)
    }

    connectionStateChangeCallback = (stompClient, state) => {
        if (MessagingEnums.ConnectionStates.CONNECTED === state) {
            this.stompClient = stompClient
            this._subscribe()
        }
        CustomEventDispatcher.dispatchEvent(MessagingEnums.ApplicationEvents.CONNECTION_STATE_CHANGE, {
            state,
            connected: state === MessagingEnums.ConnectionStates.CONNECTED
        })
    }

    buildEventMessage = (roomId, eventType, payload) => {
        return this.messageBuilder.eventMessage(roomId, eventType, payload)
    }
    buildInstantMessage = async (roomId, text, fileItem) => {
        if (fileItem) {
            return uploadFile(fileItem).then(fileInfo => {
                return this.messageBuilder.instantMessage(roomId, null, fileInfo)
            })
        }
        return this.messageBuilder.instantMessage(roomId, text)
    }
    sendMessage = (payload) => {
        let destination = (payload.messageType === 'EVENT') ? "/app/event" : "/app/im"
        let headers = {
            [MessagingEnums.MessageHeaders.MESSAGE_SENT_TIME]: Date.now(),
            [MessagingEnums.MessageHeaders.CONTENT_TYPE]: 'application/json'
        }
        //Todo , do validate before send message
        this.stompClient.send(destination, headers, JSON.stringify(payload))
        return Promise.resolve(payload)
    }

    _subscribe = () => {
        let {sessionId} = SecurityContextHolder.getCurrentContext()
        this.stompClient.subscribe(`/user/${sessionId}/queue/event`, this._messageHandler, {'ack': 'client'})
        this.stompClient.subscribe(`/user/${sessionId}/queue/im`, this._messageHandler, {'ack': 'client'})
    }
    _messageHandler = (msg) => {
        msg.ack()
        let payload = JSON.parse(msg.body)
        CustomEventDispatcher.dispatchEvent(MessagingEnums.ApplicationEvents.RECEIVED_MESSAGE, {isMessageOut: false, ...payload})
    }

}


export default MessageService