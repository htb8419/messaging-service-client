import MessageService from './MessageService'
import ApplicationConfig from "./ApplicationConfig"
import {Logger, XhrRequest} from "./lib"
import {ApplicationErrors} from "./model"
import MessagingEnums from './model/MessagingEnums'
import CommunicationService  from './CommunicationService'
import getRoomInfo from "./lib/getRoomInfo";
import fileUrl from "./lib/fileUrl";

const MESSAGE_SERVICE_DEFAULT_OPTIONS = {
    autoConnect: true,
    messageVersion: 'V2',
    connectionTimeout: 5000,
    audioElementId:'web-rtc-audio',
    retryConnect: {
        maxTryCount: 10,
        reconnectDelay: 3000
    }
}

function initializeApp(options) {
    let appOptions = {...MESSAGE_SERVICE_DEFAULT_OPTIONS, ...options}
    verifyOptions(appOptions)
    ApplicationConfig.createInstance(appOptions)
}

function verifyOptions(options) {
    let {serverUrl, callback} = options
    if (!serverUrl || !callback) {
        throw ApplicationErrors.INVALID_APP_OPTIONS
    }
}
//
//let  CommunicationService=VoiceService
export {
    fileUrl,
    getRoomInfo,
    MessagingEnums,
    MessageService,
    CommunicationService,
    initializeApp
}