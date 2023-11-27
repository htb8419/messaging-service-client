import MessageService from './MessageService'
import ApplicationConfig from "./ApplicationConfig"
import MessagingEnums from './model/MessagingEnums'
import CommunicationClient from './CommunicationClient.js'
import getRoomInfo from "./lib/getRoomInfo";
import fileUrl from "./lib/fileUrl";

function initializeApp(options) {
    ApplicationConfig.createInstance(options)
}

export {
    fileUrl,
    getRoomInfo,
    MessagingEnums,
    CommunicationClient,
    initializeApp
}