import MessagingEnums from "../model/MessagingEnums.js";
import ApplicationConfig from "../ApplicationConfig.js";
import SecurityContextHolder from "./SecurityContextHolder.js";

function createStompClient(connectionStateChangeCallback) {
    let {socketUrl} = ApplicationConfig.getConfig()
    let {accessToken, sessionId} = SecurityContextHolder.getCurrentContext()
    const brokerURL = `${socketUrl}/websocket?access_token=${accessToken}&sid=${sessionId}`
    let stompClient = window.Stomp.client(brokerURL)
    stompClient.debug = (msg) => {
        //console.debug('$stomp: ',msg)
    }
    const tryConnect = (connectionStateChangeCallback, retryCount = 0) => {
        const maxAttempts = 10, reconnectDelay = 3000
        console.debug('try connect to server, retryCount=', retryCount, ' maxAttempts=', maxAttempts)
        connectionStateChangeCallback(stompClient, MessagingEnums.ConnectionStates.CONNECTING)
        stompClient.connect({"heart-beat": "10000,10000"},
            connectionStateChangeCallback.bind(null, stompClient, MessagingEnums.ConnectionStates.CONNECTED)
            , () => {
                if (retryCount++ < maxAttempts) {
                    setTimeout(() => {
                        tryConnect(connectionStateChangeCallback, retryCount)
                    }, reconnectDelay)
                } else {
                    connectionStateChangeCallback(stompClient, MessagingEnums.ConnectionStates.DISCONNECTED)
                }
            })
    }
    tryConnect(connectionStateChangeCallback)
}

export default createStompClient