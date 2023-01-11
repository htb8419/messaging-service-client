import {EventMessageTypes,MessageTypes,ErrorCodes} from "../model";

import ApplicationConfig from "../../utils/ApplicationConfig";


class MessageValidator {

    static validate(message) {
        if (!MessageValidator.isValid(message)) {
            console.error("the message is invalid >> ", message)
            throw new Error('invalid message schema')
        }
    }

    static isValid(message) {
        const {headers, payload} = message;
        if (!(headers && payload)) {
            return false;
        }
        const {conversationId, messageType} = headers;
        if (!(conversationId && messageType)) {
            return false;
        }
        if (!MessageTypes.hasOwnProperty(messageType)) {
            return false
        }

        if (MessageTypes.EVENT === messageType) {
            const {eventType} = headers;
            if (!eventType || !EventMessageTypes.hasOwnProperty(eventType)) {
                return false
            }
        } else {
            const {messageId} = headers
            if (!messageId) {
                return false
            }
            if (MessageTypes.FILE === messageType) {
                const {fileName, fileSize, fileMimeType} = headers

                if (fileSize > ApplicationConfig.MAX_FILE_SIZE) {
                    console.error('large file size >> ', fileSize)
                    return ErrorCodes.MAX_FILE_SIZE_VIOLATION;
                }
                if (!(fileName && fileSize && fileMimeType)) {
                    return false
                }
            } else {
                if (payload.length > ApplicationConfig.MAX_TEXT_MESSAGE_LENGTH) {
                    //notify(I18nMessages.Error.maximumMessageLenghtViolation, NotificationTypes.warn)
                    return false
                }
            }
        }
        return true;
    }
}

export default MessageValidator
