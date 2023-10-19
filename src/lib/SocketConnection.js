import {Client as StompClient} from "@stomp/stompjs";

import {MessagingEnums} from '../model'
import {CustomEventDispatcher, Logger} from "./index";
import ApplicationConfig from "../ApplicationConfig";
import SecurityContextHolder from "./SecurityContextHolder";

class SocketConnection {

    constructor() {
        this.stompClient = this.createClientOverSocket();
        this.stompClient.beforeConnect = () => {
            let {retryConnect: {maxTryCount}} = ApplicationConfig.getConfig();
            Logger.getLogger()('tryCount :', this.tryCount, ' maxTryCount :', maxTryCount)
            if (this.tryCount === maxTryCount) {
                this.connectFailed()
            } else {
                this.onConnectionStateChange(MessagingEnums.ConnectionStates.CONNECTING)
                this.tryCount++
            }
        }
        this.stompClient.onConnect = this.connectSuccess
        this.stompClient.onDisconnect = this.connectFailed
        //this.stompClient.onWebSocketClose = ?
        //this.stompClient.onWebSocketError = ?
    }

    connect() {
        this.tryCount = 0
        this.stompClient.activate()
    }

    connectSuccess = () => {
        this.onConnectionStateChange(MessagingEnums.ConnectionStates.CONNECTED)
    }

    connectFailed = () => {
        this.tryCount = 0
        if (this.stompClient && this.stompClient.active) {
            this.stompClient?.deactivate().then(() => {
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
        let {socketUrl, connectionTimeout, retryConnect} = ApplicationConfig.getConfig()
        let {accessToken, sessionId} = SecurityContextHolder.getCurrentContext()
        let socketAddress = `${socketUrl}/websocket?access_token=${accessToken}&sid=${sessionId}`
        return new StompClient({
            brokerURL: socketAddress,
            debug: function (msg) {
                Logger.getLogger()('$stomp ', msg)
            },
            connectionTimeout: connectionTimeout,
            reconnectDelay: retryConnect.reconnectDelay,
            heartbeatIncoming: 2000,
            heartbeatOutgoing: 2000,
        })
    }
}

export default SocketConnection