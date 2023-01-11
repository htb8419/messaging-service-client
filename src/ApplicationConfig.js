import JwtUtil from "./lib/JwtUtil";

class ApplicationConfig {

    constructor(options) {
        let {serverUrl, accessToken, messageVersion} = options
        this.serverUrl = serverUrl
        this.accessToken = accessToken
        this.messageVersion = messageVersion
        this.username = JwtUtil.getUsername(this.accessToken)
        this.sessionId = JwtUtil.getSessionId(this.accessToken)
    }

    getServerUrl() {
        return this.serverUrl
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