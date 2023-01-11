import {MessageTypes} from "../model";

class MessageUtil {

    static isEventMessage(message) {
        return MessageUtil.getMessageType(message) === MessageTypes.EVENT
    }

    static isInstantMessage(message) {
        return MessageUtil.getMessageType(message) === MessageTypes.TEXT
    }

    static isFileMessage(message) {
        return MessageUtil.getMessageType(message) === MessageTypes.FILE
    }

    static getMessageType(message) {
        return message &&
            typeof message === 'object' &&
            message.getMessageType();
    }
}

export default MessageUtil