import JwtUtil from "./lib/JwtUtil";

class ApplicationConfig {

    constructor(options) {
        let {serverUrl, accessToken, messageVersion,connectionTimeout,retryConnect} = options
        this.serverUrl = serverUrl
        this.accessToken = accessToken
        this.messageVersion = messageVersion
        this.connectionTimeout=connectionTimeout
        this.retryConnect=retryConnect
        this.username = JwtUtil.getUsername(this.accessToken)
        this.sessionId = JwtUtil.getSessionId(this.accessToken)
        this.fileServiceUrl = 'http://192.168.103.34:9011/file'
        let wsAddress=serverUrl.startsWith("https://") ? serverUrl.replace('https://', 'wss://') : serverUrl.replace('http://', 'ws://')
        this.socketUrl=`${wsAddress}/websocket?access_token=${accessToken}&sid=${this.sessionId}`
    }

    getServerUrl() {
        return this.serverUrl
    }

    getFileServiceUrl() {
        return this.fileServiceUrl
    }
    getSocketUrl(){
        return this.socketUrl
    }

    getAccessToken() {
        return this.accessToken
    }

    getUsername() {
        return this.username
    }

    getSessionId() {
        return this.sessionId
    }

    getMessageVersion() {
        return this.messageVersion
    }

    static getConfig() {
        return window.applicationConfig
    }

    static createInstance(options) {
        //todo validate required options properties
        if (!options) {
            throw new Error('invalid options')
        }
        let applicationConfig = new ApplicationConfig(options);
        window.applicationConfig = applicationConfig
        return applicationConfig
    }
}

export default ApplicationConfig