import {MessagingEnums} from "../model";
import ApplicationConfig from "../ApplicationConfig";

let sequenceNumber = 0

class MessageBuilder {

    instantMessage(roomId, text, fileInfo) {
        let media = fileInfo ? [fileInfo] : []
        return this.buildMessage(roomId, MessagingEnums.MessageTypes.IM, {text, media})
    }

    eventMessage(roomId, eventType, payload) {
        payload[MessagingEnums.MessageBodyAttributes.EVENT_TYPE] = eventType
        return this.buildMessage(roomId, MessagingEnums.MessageTypes.EVENT, payload)
    }

    buildMessage(roomId, messageType, payload, headers = {}) {
        this.sessionId = ApplicationConfig.getConfig().getSessionId()
        const messageId = this.sessionId + "." + Date.now() + '.' + (++sequenceNumber)

        let messagePayload = {
            [MessagingEnums.MessageBodyAttributes.ROOM_ID]: roomId,
            [MessagingEnums.MessageBodyAttributes.MESSAGE_ID]: messageId,
            ...payload
        }
        return Promise.resolve({messageType, ...messagePayload, isMessageOut: true})
    }
}

export default MessageBuilder