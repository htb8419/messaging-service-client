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
    }, ApplicationEvents: {
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
        OPEN_CONVERSATION: 'OPEN_CONVERSATION',
        CLOSE_CONVERSATION: 'CLOSE_CONVERSATION',
        UPDATE_AGENT_PROFILE: 'UPDATE_AGENT_PROFILE',
        AGENT_USER_INFO: 'AGENT_USER_INFO',
        WEBRTC_OFFER: 'OFFER',
        WEBRTC_ANSWER: 'ANSWER',
        WEBRTC_CANDIDATE: 'CANDIDATE',
        WEBRTC_END_CALL: 'END_CALL',
        WEBRTC_CONNECTION_CANCEL: 'CONNECTION_CANCEL'
        //WEBRTC_CONNECTION_REQUEST: 'WEBRTC_CONNECTION_REQUEST',
        //WEBRTC_CONNECTION_RESPONSE: 'WEBRTC_CONNECTION_RESPONSE',
    },
    webRtcEvents:{
        OFFER: 'OFFER',
        ANSWER: 'ANSWER',
        CANDIDATE: 'CANDIDATE',
        END_CALL: 'END_CALL',
        CONNECTION_CANCEL: 'CONNECTION_CANCEL'
        //WEBRTC_CONNECTION_REQUEST: 'WEBRTC_CONNECTION_REQUEST',
        //WEBRTC_CONNECTION_RESPONSE: 'WEBRTC_CONNECTION_RESPONSE',
    },
    VoiceCallStates: {
        CONNECTING: 'CONNECTING',
        CONNECTED: 'CONNECTED',
        DISCONNECTED: 'DISCONNECTED'
    }
}

export default MessagingEnums