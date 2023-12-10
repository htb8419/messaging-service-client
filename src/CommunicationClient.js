//require for webrtc shim
import adapter from 'webrtc-adapter'

import * as webRTc from "./lib/rtc/RtcPeerConnection.js"
import {CustomEventDispatcher} from "./lib"
import MessagingEnums from "./model/MessagingEnums"
import ApplicationConfig from "./ApplicationConfig.js"
import StompClient from "./StompClient.js"
import {UIEvents} from "./model/index.js"
import getParticipantsState from "./lib/getParticipantsState.js"

class CommunicationClient {

    constructor(roomId) {
        this.roomId = roomId
        CustomEventDispatcher.registerEventListener(MessagingEnums.ApplicationEvents.CONNECTION_STATE_CHANGE, this._handleAppEvents)
        CustomEventDispatcher.registerEventListener(MessagingEnums.ApplicationEvents.RECEIVED_MESSAGE, this._handleAppEvents)
        CustomEventDispatcher.registerEventListener(MessagingEnums.ApplicationEvents.CALL_STATE_CHANGE, this._handleAppEvents)
        CustomEventDispatcher.registerEventListener(MessagingEnums.ApplicationEvents.THROW_EXCEPTION, this._handleAppEvents)

        this.messageService = new StompClient()
        window.communicationService = this
    }

    getParticipantsState = async () => {
        return getParticipantsState(this.roomId)
    }
    disconnect = () => {
        webRTc.closeRtcPeerConnection()
        this.changePresenceState(MessagingEnums.UserPresenceState.OFFLINE).then(() => {
            this.messageService.disconnect()
            window.communicationService = null
        })
    }
    sendEvent = async (eventType, payload) => {
        return this.messageService.buildEventMessage(this.roomId, eventType, payload).then(this.messageService.sendMessage)
    }

    sendMessage = async (text, fileItem) => {
        return this.messageService.buildInstantMessage(this.roomId, text, fileItem).then(this.messageService.sendMessage)
    }

    makeCall = () => {
        if (webRTc.canStartRtcCall()) {
            webRTc.initRtcPeerConnection().then(() => {
                this.sendRtcEvent(MessagingEnums.webRtcEvents.CALL_REQUEST, {})
            })
        }
    }

    endCall = (forceCloseSession = false) => {
        webRTc.closeRtcPeerConnection()
        this.sendRtcEvent(MessagingEnums.webRtcEvents.END_CALL, {forceCloseSession}).then(() => {
            if (forceCloseSession) {
                this.messageService.disconnect()
            }
        })
    }

    playLocalMedia = () => {
        webRTc.playLocalVideo()
    }

    pauseLocalMedia = () => {
        webRTc.pauseLocalVideo()
    }

    sendRtcEvent = (state, rtcObject) => {
        return this.sendEvent(MessagingEnums.EventMessageTypes.WRTC, {
            state,
            rtcObject
        })
    }
    changeTypingState = (state) => {
        if (MessagingEnums.typingState.hasOwnProperty(state)) {
            this.sendEvent(MessagingEnums.EventMessageTypes.TYPING_STATE, {state})
        }
    }

    changePresenceState = (presence) => {
        return this.sendEvent(MessagingEnums.EventMessageTypes.CHANGE_PRESENCE_STATUS, {presence})
    }

    getFileUrl = (fileId) => {
        let {fileServiceUrl} = ApplicationConfig.getConfig()
        return fileServiceUrl + "/" + fileId
    }

    getRoomId = () => {
        return this.roomId
    }

    //  ***   Handle Events   ***
    _handleAppEvents = ({type: eventType, detail}) => {
        let appEventDetail = detail
        let {ApplicationEvents} = MessagingEnums
        if (eventType === ApplicationEvents.RECEIVED_MESSAGE) {
            if (detail.messageType === 'EVENT') {
                if (MessagingEnums.webRtcEvents.hasOwnProperty(detail.state)) {
                    webRTc.handleRtcEvents(detail.state, detail.rtcObject)
                    return
                }
                eventType = detail.type
            }
        } else if (eventType === ApplicationEvents.CONNECTION_STATE_CHANGE) {
            if (detail.state === 'CONNECTED') {
                this.changePresenceState(MessagingEnums.UserPresenceState.ONLINE)
            }
        }
        this._uiCallback(eventType, appEventDetail)
    }

    _uiCallback = (eventType, detail) => {
        let applicationEvent = UIEvents[eventType]
        if (applicationEvent && detail) {
            let {callback} = ApplicationConfig.getConfig()
            callback(applicationEvent, detail)
        }
    }
}

export default CommunicationClient