import {CustomEventDispatcher, MessageBuilder} from "./lib"
import {MessagingEnums} from "./model";
import SecurityContextHolder from "./lib/SecurityContextHolder.js";
import uploadFile from "./lib/uploadFile.js";
import ApplicationConfig from "./ApplicationConfig.js";

class StompClient {

    constructor() {
        this.messageBuilder = new MessageBuilder();
        this.tryConnect()
    }

    disconnect = () => {
        this.stompClient.disconnect()
    }
    connectionStateChangeCallback = (state) => {
        if (MessagingEnums.ConnectionStates.CONNECTED === state) {
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
    createClient = () => {
        let {socketUrl} = ApplicationConfig.getConfig()
        let {accessToken, sessionId} = SecurityContextHolder.getCurrentContext()
        const brokerURL = `${socketUrl}/websocket?access_token=${accessToken}&sid=${sessionId}`
        //const brokerURL = `ws://192.168.105.126:9090/websocket?access_token=${accessToken}&sid=${sessionId}`
        this.stompClient = window.Stomp.client(brokerURL)
        this.stompClient.debug = (msg) => {
            console.debug('$stomp: ', msg)
        }
    }

    tryConnect = (retryCount = 0) => {
        if (!this.stompClient) {
            this.createClient()
        }
        const maxAttempts = 10, reconnectDelay = 3000
        //console.debug('try connect to server, retryCount=', retryCount, ' maxAttempts=', maxAttempts)
        this.connectionStateChangeCallback(MessagingEnums.ConnectionStates.CONNECTING)
        this.stompClient.connect({"heart-beat": "10000,10000"}, () => {
            this.connectionStateChangeCallback(MessagingEnums.ConnectionStates.CONNECTED)
        }, () => {
            if (retryCount++ < maxAttempts) {
                setTimeout(() => {
                    this.tryConnect(retryCount)
                }, reconnectDelay)
            } else {
                this.connectionStateChangeCallback(MessagingEnums.ConnectionStates.DISCONNECTED)
            }
        })
    }

}


export default StompClient