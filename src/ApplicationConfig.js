import {ApplicationErrors} from "./model";

const _DEFAULT_MESSAGING_SERVICE_OPTIONS = {
    autoConnect: true,
    messageVersion: 'V2',
    connectionTimeout: 5000,
    socket: {
        maxAttempts: 20,
        reconnectDelay: 3000,
        heartbeatIncoming: 20000,
        heartbeatOutgoing: 20000
    },
    webRtc: {
        rtcConfig: {
            "iceServers": [{"urls": "stun:turn.demisco.com:5349"},
                {
                    "urls": "turn:turn.demisco.com:5349",
                    "credential": "turn",
                    "username": "turn"
                }]
        },
        mediaStreamConstraints: {
            'video': {
                width: {min: 160, ideal: 320, max: 640},
                height: {min: 120, ideal: 240, max: 480},
                frameRate: {min: 10, ideal: 16, max: 20}
            },
            'audio': {
                echoCancellation: true,
                noiseSuppression: true,
            }
        },
        offerOptions: {
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
        }
    }
}

class ApplicationConfig {

    static getWebRtcConfig(){
        let {webRtc}=window.$applicationConfig
        return webRtc
    }
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