import {Client as StompClient} from "@stomp/stompjs";

import {MessagingEnums} from '../model'
import CustomEventDispatcher from "./CustomEventDispatcher";
import ApplicationConfig from "../ApplicationConfig";
import SecurityContextHolder from "./SecurityContextHolder";

class SocketConnection {
    connect() {
        this.stompClient = this.createClientOverSocket();
        this.stompClient.activate()
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
        //socketUrl='ws://192.168.103.127:9090/ws-adapter'
        let  brokerURL= `${socketUrl}/websocket?access_token=${accessToken}&sid=${sessionId}`
        let retryCount = 0
        const stompClient = new StompClient({
            brokerURL: brokerURL,
            debug: function (msg) {
                console.debug('$stomp ', msg)
            },
            connectionTimeout: connectionTimeout,
            reconnectDelay: socketConfig.reconnectDelay,
            heartbeatIncoming: socketConfig.heartbeatIncoming,
            heartbeatOutgoing: socketConfig.heartbeatOutgoing,
        })
        stompClient.onConnect =()=>{
                retryCount = 0
                this.onConnectionStateChange(MessagingEnums.ConnectionStates.CONNECTED)
        }

        stompClient.beforeConnect = () => {
            console.debug('retryCount :', retryCount, ' maxAttempts :', socketConfig.maxAttempts)
            if (retryCount === socketConfig.maxAttempts) {
                stompClient.deactivate().then(() => {
                    this.onConnectionStateChange(MessagingEnums.ConnectionStates.DISCONNECTED)
                })
            } else {
                this.onConnectionStateChange(MessagingEnums.ConnectionStates.CONNECTING)
                retryCount++
            }
        }
        stompClient.logRawCommunication=true
        return stompClient
    }
}

export default SocketConnection