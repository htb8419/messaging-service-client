import {MessagingEnums} from "./model";
import MessageQueue from "./model/MessageQueue";
import CustomEventDispatcher from "./lib/CustomEventDispatcher";

import SecurityContextHolder from "./lib/SecurityContextHolder";

class MessageChanel {

    constructor(stompClient) {
        this.insyncFlg = false
        this.syncIntervalId = null;
        this.stompClient = stompClient
        this.messageQueue = new MessageQueue()
        let {sessionId} = SecurityContextHolder.getCurrentContext()
        stompClient.subscribe(`/user/${sessionId}/queue/event`, this.receive)
        stompClient.subscribe(`/user/${sessionId}/queue/im`, this.receive)
    }

    send = (message) => {
        //MessageValidator.validate(message);\
        //console.log('send message >>>', message)
        if (message.messageType === 'EVENT') {
            this._sendMessage(message, "/app/event")
        } else {
            this.messageQueue.enqueue(message);
            this.enable()
        }
    }

    receive = (inputMessage) => {
        inputMessage.ack()
        let payload = JSON.parse(inputMessage.body)
        let message = {isMessageOut: false, ...payload}
        CustomEventDispatcher.dispatchEvent(MessagingEnums.ApplicationEvents.RECEIVED_MESSAGE, {message})
    }

    enable = () => {
        if (!this.syncIntervalId) {
            const SYNC_MESSAGE_QUEUE_INTERVAL = 300;
            this.syncIntervalId = setInterval(this._syncMessageQueue, SYNC_MESSAGE_QUEUE_INTERVAL)
        }
    }

    disable = () => {
        if (this.syncIntervalId) {
            clearInterval(this.syncIntervalId)
            this.syncIntervalId = null;
        }
    }

    shutdown = () => {
        this.messageQueue.clear()
        this.disable()
    }
    _syncMessageQueue = () => {
        if (this.insyncFlg
            || this.messageQueue.isEmpty()) {
            return 0;
        }
        try {
            this.insyncFlg = true;
            let messages = this.messageQueue.getMessages();
            messages.forEach((msg) => {
                const CHAT_MESSAGE_DESTINATION = "/app/im";
                this._sendMessage(msg, CHAT_MESSAGE_DESTINATION)
                this.messageQueue.dequeue()
            });
            this.insyncFlg = false;
        } catch (e) {
            //todo handle exception
            console.error('handle server error >> ', e);
            throw e
        }
    }

    _sendMessage(message, destination) {
        let headers = {
            [MessagingEnums.MessageHeaders.MESSAGE_SENT_TIME]: Date.now(),
            [MessagingEnums.MessageHeaders.CONTENT_TYPE]: 'application/json'
        }
        this.stompClient.publish({destination, body: JSON.stringify(message), headers});
    }
}

export default MessageChanel
