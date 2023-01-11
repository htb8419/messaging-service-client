import MessageService from './MessageService'
import ApplicationConfig from "./ApplicationConfig";
import {Logger, XhrRequest} from "./lib";
import {ApplicationErrors} from "./model";
import getRoomInfo from './lib/getRoomInfo'
import MessagingEnums from './model/MessagingEnums'

const MESSAGE_SERVICE_DEFAULT_OPTIONS = {
    autoConnect: true,
    messageVersion: 'V2',
    retryConnect: {
        tryCount: 10,
        delayTime: 3
    }
}

function initialMessageService(options) {
    let appOptions = {...MESSAGE_SERVICE_DEFAULT_OPTIONS, ...options}
    verifyOptions(appOptions)
    ApplicationConfig.createInstance(appOptions);
    return login().then(() => {
        let messageService = new MessageService(appOptions.callback);
        messageService.connect()
        return messageService
    })
}

function login() {
    let {serverUrl, accessToken} = ApplicationConfig.getConfig()
    return XhrRequest.GET(`${serverUrl}/me`, {"Authorization": `bearer ${accessToken}`})
        .catch(ex => {
            Logger.error(ex)
            throw ApplicationErrors.CONNECTION_FAILED
        })
}

function verifyOptions(options) {
    let {serverUrl, accessToken, callback} = options
    if (!serverUrl || !accessToken || !callback) {
        throw ApplicationErrors.INVALID_APP_OPTIONS
    }
}

export {
    getRoomInfo,
    MessagingEnums,
    initialMessageService
}