import ApplicationErrors from './ApplicationErrors'
import MessagingEnums from './MessagingEnums'

const UIEvents = {
    "CONNECTION_STATE_CHANGE": MessagingEnums.ApplicationEvents.CONNECTION_STATE_CHANGE,
    "RECEIVED_MESSAGE": MessagingEnums.ApplicationEvents.RECEIVED_MESSAGE,
    "DELIVERY": MessagingEnums.ApplicationEvents.MESSAGE_DELIVERY,
    "TYPING": MessagingEnums.ApplicationEvents.TYPING_STATE_CHANGE,
    "PRESENCE": MessagingEnums.ApplicationEvents.PRESENCE_STATE_CHANGE,
    "CALL_STATE_CHANGE": MessagingEnums.ApplicationEvents.CALL_STATE_CHANGE,
}
export {
    ApplicationErrors,
    MessagingEnums,
    UIEvents
}