import {ApplicationErrors} from "./model";

const _DEFAULT_MESSAGING_SERVICE_OPTIONS = {
    autoConnect: true,
    messageVersion: 'V2',
    connectionTimeout: 5000,
    retryConnect: {
        maxTryCount: 10,
        reconnectDelay: 3000
    },
    webRtc: {
        audioElementId: 'webrtc-audio',
        localVideoElementId: 'localVideo',
        remoteVideoElementId: 'remoteVideo',
        serverConfiguration: {
            "iceServers": [{"urls": "stun:turn.demisco.com:5349"},
                {
                    "urls": "turn:turn.demisco.com:5349",
                    "credential": "turn",
                    "username": "turn"
                }]
        }
    }
}

class ApplicationConfig {

    static getConfig() {
        return window.$applicationConfig
    }

    static verifyOptions = (options) => {
        if (!options) {
            throw new Error('invalid options')
        }
        let {serverUrl, callback} = options
        if (!serverUrl || !callback) {
            throw ApplicationErrors.INVALID_APP_OPTIONS
        }
    }

    static createInstance(options) {
        ApplicationConfig.verifyOptions(options)
        let appOptions = Object.assign(_DEFAULT_MESSAGING_SERVICE_OPTIONS, options)
        let {serverUrl} = appOptions
        let wsAddress = serverUrl.startsWith("https://") ? serverUrl.replace('https://', 'wss://') : serverUrl.replace('http://', 'ws://')
        let socketUrl = `${wsAddress}/ws-adapter`

        window.$applicationConfig = {
            fileServiceUrl: `${serverUrl}/fs/file`,
            socketUrl,
            ...appOptions
        }
        return window.$applicationConfig
    }
}

export default ApplicationConfig