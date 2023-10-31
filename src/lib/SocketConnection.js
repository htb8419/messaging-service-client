import {Client as StompClient} from "@stomp/stompjs";

import {MessagingEnums} from '../model'
import {CustomEventDispatcher, Logger} from "./index";
import ApplicationConfig from "../ApplicationConfig";
import SecurityContextHolder from "./SecurityContextHolder";

class SocketConnection {

    constructor() {
        //this.stompClient.onWebSocketClose = ?
        //this.stompClient.onWebSocketError = ?
    }

    connect() {
        this.stompClient = this.createClientOverSocket();
        this.retryCount = 0
        this.stompClient.activate()
    }

    connectSuccess = () => {
        this.retryCount = 0
        this.onConnectionStateChange(MessagingEnums.ConnectionStates.CONNECTED)
    }

    connectFailed = () => {
        if (this.stompClient) {
            this.stompClient.deactivate().then(() => {
                this.onConnectionStateChange(MessagingEnums.ConnectionStates.DISCONNECTED)
            })
        }
    }

    onConnectionStateChange = (connectionState) => {
        CustomEventDispatcher.dispatchEvent(MessagingEnums.ApplicationEvents.CONNECTION_STATE_CHANGE, {
            stompClient: this.stompClient,
            connected: MessagingEnums.ConnectionStates.CONNECTED === connectionState,
            state: connectionState
        })
    }

    createClientOverSocket = () => {
        let {socketUrl, connectionTimeout, socket: socketConfig} = ApplicationConfig.getConfig()
        let {accessToken, sessionId} = SecurityContextHolder.getCurrentContext()
        let socketAddress = `${socketUrl}/websocket?access_token=${accessToken}&sid=${sessionId}`
        let stompClient = new StompClient({
            brokerURL: socketAddress,
            debug: function (msg) {
                Logger.getLogger()('$stomp ', msg)
            },
            connectionTimeout: connectionTimeout,
            reconnectDelay: socketConfig.reconnectDelay,
            heartbeatIncoming: socketConfig.heartbeatIncoming,
            heartbeatOutgoing: socketConfig.heartbeatOutgoing,
        })
        stompClient.onConnect = this.connectSuccess
        stompClient.onDisconnect = this.connectFailed
        stompClient.beforeConnect = () => {
            Logger.getLogger()('retryCount :', this.retryCount, ' maxAttempts :', socketConfig.maxAttempts)
            if (this.retryCount === socketConfig.maxAttempts) {
                this.connectFailed()
            } else {
                this.onConnectionStateChange(MessagingEnums.ConnectionStates.CONNECTING)
                this.retryCount++
            }
        }
        return stompClient
    }
}

export default SocketConnection