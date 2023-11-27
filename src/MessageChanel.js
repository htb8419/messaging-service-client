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

    }

    send = (message) => {
        //
        if (message.messageType === 'EVENT') {
            this._sendMessage(message, "/app/event")
        } else {
            this.messageQueue.enqueue(message);
            this.enable()
        }
    }
    enable = () => {
        if (!this.syncIntervalId) {
            const SYNC_MESSAGE_QUEUE_INTERVAL = 100;
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
        this.stompClient.send(destination, headers, JSON. stringify(message))
    }
}

export default MessageChanel
