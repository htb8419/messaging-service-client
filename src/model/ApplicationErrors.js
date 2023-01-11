import MessagingAppMessages from "../i18n/messages_fa.json";

const ErrorCodes = {
    INVALID_APP_OPTIONS: 'INVALID_APP_OPTIONS',
    INVALID_ACCESS_TOKEN: 'INVALID_ACCESS_TOKEN',
    CONNECTION_FAILED: 'CONNECTION_FAILED',
    MESSAGE_SCHEMA_VIOLATION: 'MESSAGE_SCHEMA_VIOLATION',
    MAX_FILE_SIZE_VIOLATION: 'MAX_FILE_SIZE_VIOLATION',
    MAX_TEXT_MESSAGE_LENGTH: 'MAX_TEXT_MESSAGE_LENGTH'
}

class CustomError extends Error {
    constructor(code, message, blocking = true) {
        super(message ? message : MessagingAppMessages['errors'][code])
        this.code = code
        this.blocking = blocking
    }
}

const ApplicationErrors = {
    MAX_FILE_SIZE_VIOLATION: new CustomError(ErrorCodes.MAX_FILE_SIZE_VIOLATION, null, false),
    INVALID_APP_OPTIONS: new CustomError(ErrorCodes.INVALID_APP_OPTIONS),
    INVALID_ACCESS_TOKEN: new CustomError(ErrorCodes.INVALID_ACCESS_TOKEN),
    CONNECTION_FAILED: new CustomError(ErrorCodes.CONNECTION_FAILED)
}

export default ApplicationErrors
export {
    CustomError, ErrorCodes
}