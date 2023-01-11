import {Client as StompClient} from "@stomp/stompjs";

import {MessagingEnums} from './model'
import {CustomEventDispatcher, Logger} from "./lib";
import ApplicationConfig from "./ApplicationConfig";

class SocketConnection {

    connect() {
        this.tryCount = 0
        this.stompClient = null
        this.tryConnect()
    }

    tryConnect = () => {
        this.onConnectionStateChange(MessagingEnums.ConnectionStates.CONNECTING)
        this.stompClient = this.createClientOverSocket();
        this.stompClient.debug = Logger.debug.bind(null, '[stomp] :')
        this.stompClient.onConnect=this.connectSuccess
        this.stompClient.onDisconnect=this.connectFailed
        this.stompClient.activate()
    }
    connectSuccess = () => {
        console.log('socket connection successful', this.stompClient)
        this.tryCount = 0
        this.onConnectionStateChange(MessagingEnums.ConnectionStates.CONNECTED)
    }
    connectFailed = () => {
        console.log('socket connection failed, try connect condition [', this.tryCount , ']')
        this.onConnectionStateChange(MessagingEnums.ConnectionStates.DISCONNECTED)
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
        let {serverUrl, accessToken, sessionId} = ApplicationConfig.getConfig();
        let wsUrl = serverUrl.startsWith("https://") ? serverUrl.replace('https://', 'wss://') : serverUrl.replace('http://', 'ws://')
        return new StompClient({
            brokerURL: `${wsUrl}/websocket?access_token=${accessToken}`,
            debug: function (str) {
                console.log(str);
            },
            reconnectDelay: 5000,
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