import {MessagingEnums} from "../model";
import ApplicationConfig from "../ApplicationConfig";
import SecurityContextHolder from "./SecurityContextHolder";

class MessageBuilder {

    constructor() {
        this.sequenceNumber = 1
        let {sessionId} = SecurityContextHolder.getCurrentContext()
        this.sessionId=sessionId
    }

    instantMessage(roomId, text, fileInfo) {
        let media = fileInfo ? [fileInfo] : []
        return this.buildMessage(roomId, MessagingEnums.MessageTypes.IM, {text, media})
    }

    eventMessage(roomId, eventType, payload) {
        payload[MessagingEnums.MessageBodyAttributes.EVENT_TYPE] = eventType
        return this.buildMessage(roomId, MessagingEnums.MessageTypes.EVENT, payload)
    }

    buildMessage(roomId, messageType, payload, headers = {}) {
        if (!roomId) {
            throw new Error('roomId is null!')
        }
        const messageId = this.sessionId + "." + Date.now() + '.' + (this.sequenceNumber++)
        let messagePayload = {
            [MessagingEnums.MessageBodyAttributes.ROOM_ID]: roomId,
            [MessagingEnums.MessageBodyAttributes.MESSAGE_ID]: messageId,
            ...payload
        }
        return Promise.resolve({messageType, ...messagePayload, isMessageOut: true})
    }
}

export default MessageBuilder