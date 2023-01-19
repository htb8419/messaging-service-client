import MessagingAppMessages from "../i18n/messages_fa.json";

const MessagingErrorCodes = {
    INVALID_APP_OPTIONS: 'INVALID_APP_OPTIONS',
    INVALID_ACCESS_TOKEN: 'INVALID_ACCESS_TOKEN',
    CONNECTION_FAILED: 'CONNECTION_FAILED',
    MESSAGE_SCHEMA_VIOLATION: 'MESSAGE_SCHEMA_VIOLATION',
    MAX_FILE_SIZE_VIOLATION: 'MAX_FILE_SIZE_VIOLATION',
    MAX_TEXT_MESSAGE_LENGTH: 'MAX_TEXT_MESSAGE_LENGTH',
    ERROR_ON_ACCESSING_MEDIA_DEVICES: 'ERROR_ON_ACCESSING_MEDIA_DEVICES'
}
//Error accessing media devices
class CustomError extends Error {
    constructor(code, message, blocking = true) {
        super(message ? message : MessagingAppMessages['errors'][code])
        this.code = code
        this.blocking = blocking
    }
}

const ApplicationErrors = {
    ERROR_ON_ACCESSING_MEDIA_DEVICES: new CustomError(MessagingErrorCodes.ERROR_ON_ACCESSING_MEDIA_DEVICES, null, true),
    MAX_FILE_SIZE_VIOLATION: new CustomError(MessagingErrorCodes.MAX_FILE_SIZE_VIOLATION, null, false),
    INVALID_APP_OPTIONS: new CustomError(MessagingErrorCodes.INVALID_APP_OPTIONS),
    INVALID_ACCESS_TOKEN: new CustomError(MessagingErrorCodes.INVALID_ACCESS_TOKEN),
    CONNECTION_FAILED: new CustomError(MessagingErrorCodes.CONNECTION_FAILED)
}

export default ApplicationErrors
export {
    MessagingErrorCodes
}