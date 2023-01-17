import {Client as StompClient} from "@stomp/stompjs";

import {MessagingEnums} from './model'
import {CustomEventDispatcher, Logger} from "./lib";
import ApplicationConfig from "./ApplicationConfig";

class SocketConnection {

    constructor() {
        this.stompClient = this.createClientOverSocket();
        this.stompClient.beforeConnect = () => {
            let {retryConnect: {maxTryCount}} = ApplicationConfig.getConfig();
            console.log('tryCount :', this.tryCount, ' maxTryCount :', maxTryCount)
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
        if (MessagingEnums.ConnectionStates.CONNECTED === connectionState && this.stompClient && !this.stompClient.connected) {
            Logger.error('invalid stomp connection state')
            //Todo Throw Error
        } else {
            CustomEventDispatcher.dispatchEvent(MessagingEnums.ApplicationEvents.CONNECTION_STATE_CHANGE, {
                stompClient: this.stompClient,
                connected: MessagingEnums.ConnectionStates.CONNECTED === connectionState,
                state: connectionState
            })
        }
    }
    createClientOverSocket = () => {
        let {socketUrl, connectionTimeout, retryConnect} = ApplicationConfig.getConfig();
        return new StompClient({
            brokerURL: socketUrl,
            debug: function (msg) {
                Logger.debug.bind('$stomp >', msg)
            },
            connectionTimeout: connectionTimeout,
            reconnectDelay: retryConnect.reconnectDelay,
            heartbeatIncoming: 2000,
            heartbeatOutgoing: 2000,
        })
    }
    createClientOverSockjs = () => {
        return null //temp
        /*  const Sockjs = require('sockjs-client')
          const Stomp = require('stompjs')
          let {serverUrl, accessToken, sessionId} = ApplicationConfig.getConfig();
          let ws = new Sockjs(`${serverUrl}/websocket?access_token=${accessToken}`, [], {
              transports: ["websocket"],
              timeout: 5000,
              sessionId: () => sessionId
          });
          return Stomp.over(ws);*/
    }
}

export default SocketConnection