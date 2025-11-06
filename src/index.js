//require for webrtc shim
import adapter from 'webrtc-adapter'

import ApplicationConfig from "./ApplicationConfig"
import MessagingEnums from './model/MessagingEnums'
import CommunicationClient from './CommunicationClient.js'
import getRoomInfo from "./lib/getRoomInfo";
import fileUrl from "./lib/fileUrl";
import SecurityContextHolder from './lib/SecurityContextHolder'

function initializeApp(options) {
    SecurityContextHolder.initialContext(options['accessToken'])
    ApplicationConfig.createInstance(options)
}

export {
    fileUrl,
    getRoomInfo,
    MessagingEnums,
    CommunicationClient,
    initializeApp
}