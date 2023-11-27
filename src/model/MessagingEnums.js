const MessagingEnums = {
    MessageTypes: {
        IM: 'IM',
        EVENT: 'EVENT'
    },
    DeliveryStatus: {
        SERVER_DELIVERY: 'SERVER',
        CLIENT_DELIVERY: 'CLIENT'
    },
    ConnectionStates: {
        CONNECTING: 'CONNECTING',
        CONNECTED: 'CONNECTED',
        DISCONNECTED: 'DISCONNECTED'
    },
    MessageBodyAttributes: {
        TEXT: 'text',
        MEDIA: 'media',
        EVENT_TYPE: 'type',
        ROOM_ID: 'room',
        MESSAGE_TYPE: 'messageType',
        MESSAGE_ID: 'clientMessageId',
        FILE_NAME: 'fileName',
        FILE_SIZE: 'fileSize',
        FILE_MIME_TYPE: 'fileMimType'
    },
    MessageHeaders: {
        MESSAGE_SEQ: 'messageSeq',
        MESSAGE_SENT_TIME: 'sent',
        CONTENT_TYPE: 'content-type'
    },
    UserPresenceState: {
        ONLINE: 'ONLINE',
        AWAY: 'AWAY',
        BUSY: 'BUSY',
        TYPING: 'TYPING',
        OFFLINE: 'OFFLINE',
    },
    ApplicationEvents: {
        CONNECTION_STATE_CHANGE: 'CONNECTION_STATE_CHANGE',
        RECEIVED_MESSAGE: 'RECEIVED_MESSAGE',
        MESSAGE_DELIVERY: 'MESSAGE_DELIVERY',
        TYPING_STATE_CHANGE: "TYPING_STATE_CHANGE",
        PRESENCE_STATE_CHANGE: "PRESENCE_STATE_CHANGE",
        CALL_STATE_CHANGE: "CALL_STATE_CHANGE",
        THROW_EXCEPTION: "THROW_EXCEPTION"
    },
    EventMessageTypes: {
        TYPING_STATE: 'TYPING',
        MESSAGE_DELIVERY: 'DELIVERY',
        CHANGE_PRESENCE_STATUS: 'PRESENCE',
        WRTC: 'WRTC'
    },
    webRtcEvents: {
        OFFER: 'OFFER',
        ANSWER: 'ANSWER',
        CANDIDATE: 'CANDIDATE',
        END_CALL: 'END_CALL',
        CONNECTION_CANCEL: 'CONNECTION_CANCEL',
        CALL_REQUEST: 'CALL_REQUEST',
        CALL_ACCEPTED: 'CALL_ACCEPTED',
    },
    VoiceCallStates: {
        CONNECTING: 'CONNECTING',
        CONNECTED: 'CONNECTED',
        DISCONNECTED: 'DISCONNECTED'
    },
    typingState: {
        START_TYPING: 'START_TYPING',
        STOP_TYPING: 'STOP_TYPING'
    }
}

export default MessagingEnums