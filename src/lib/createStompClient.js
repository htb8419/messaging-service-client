import MessagingEnums from "../model/MessagingEnums.js";
import ApplicationConfig from "../ApplicationConfig.js";
import SecurityContextHolder from "./SecurityContextHolder.js";

const tryStompConnect = (stompClient, connectionStateChangeCallback, retryCount = 0) => {
    const maxAttempts = 10, reconnectDelay = 3000
    console.debug('try connect to server, retryCount=', retryCount, ' maxAttempts=', maxAttempts)
    connectionStateChangeCallback(stompClient, MessagingEnums.ConnectionStates.CONNECTING)
    stompClient.connect({"heart-beat": "20000,20000"},
        connectionStateChangeCallback.bind(null, stompClient, MessagingEnums.ConnectionStates.CONNECTED)
        , () => {
            if (retryCount++ < maxAttempts) {
                setTimeout(() => {
                    tryStompConnect(stompClient, connectionStateChangeCallback, retryCount)
                }, reconnectDelay)
            } else {
                connectionStateChangeCallback(stompClient, MessagingEnums.ConnectionStates.DISCONNECTED)
            }
        })
}

function createStompClient(connectionStateChangeCallback) {
    let {socketUrl} = ApplicationConfig.getConfig()
    let {accessToken, sessionId} = SecurityContextHolder.getCurrentContext()
    const brokerURL = `${socketUrl}/websocket?access_token=${accessToken}&sid=${sessionId}`
    let stompClient = window.Stomp.client(brokerURL)
    stompClient.debug = (msg) => {
        console.debug('$stomp: ',msg)
    }
    tryStompConnect(stompClient, connectionStateChangeCallback)
}

export default createStompClient