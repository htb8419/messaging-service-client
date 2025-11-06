# Messaging service client
---

## Getting started

### Get roomInfo

```javascript

import {initializeApp, CommunicationClient, MessagingEnums} 
    from '@dms-im/messaging-service'
```

### create CommunicationClient instance 

```javascript

const instantMessagingOptions = {
    roomId:roomId,
    accessToken:accessToken,
    serverUrl: `${API_SERVER_URL}`,
    callback: handleEvent // func(type,detail)
}
initializeApp(instantMessagingOptions)
window.communicationClient = new CommunicationClient();
```

___

### send text & file message

```javascript

sendInstantMessage = (text, fileItem, beforeSend) => {
    communicationClient.sendMessage(text, fileItem).then(message => {
        if (beforeSend) {
            beforeSend.call(null, message)
        }
    }).catch(this.handleException)
}
```
___

### send text message

```javascript

messageService.buildTextMessage(roomId, text).then(message => {
    messageService.sendMessage(message)
}).catch(this.handleException)

```

### change typing state

```javascript

startTyping = () => {
    communicationClient.changeTypingState(MessagingEnums.typingState.START_TYPING)
}
```

---
### handle events

```javascript

handleChatEvent = (eventType, detail) => {
    if (!window.communicationClient || window.communicationClient.roomId !== detail.room) {
        return
    }
    if (MessagingEnums.ApplicationEvents.TYPING_STATE === eventType) {
        updateSharedState(SubjectTypes.TYPING_STATE, detail)
    } else if (MessagingEnums.ApplicationEvents.RECEIVED_MESSAGE === eventType) {
        addMessageToQueue(detail)
    } else if (MessagingEnums.ApplicationEvents.MESSAGE_DELIVERY === eventType) {
        updateDeliveryState(detail)
    } else if (MessagingEnums.ApplicationEvents.CONNECTION_STATE_CHANGE === eventType) {
        updateSharedState(SubjectTypes.CONNECTION_STATE, detail)
    } else if (MessagingEnums.ApplicationEvents.PRESENCE_STATE_CHANGE === eventType) {
        if (detail.presence === 'ONLINE') {
            //Todo anything
        }
    }
}
```

---

## Messaging Events

| Event Types                    | Detail Interface                         |
|--------------------------------|------------------------------------------|
| CONNECTION_STATE_CHANGE        | ConnectionStateChangeEvent               |
| RECEIVED_MESSAGE               | ReceivedMessageEvent                     |
| MESSAGE_DELIVERY               | MessageDeliveryEvent                     |
| TYPING_STATE_CHANGE            | TypingStateChangeEvent                   |

---

## Event Detail Interface

### ConnectionStateChangeEvent

```typescript

interface ConnectionStateChangeEvent {
    state: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'
}
```

### ReceivedMessageEvent

```typescript

interface ReceivedMessageEvent {
    room:string,
    from:string,
    createdAt:string,
    clientMessageId:string,
    text?: string,
    media?: Media
}

interface Media {
    fileId: string,
    name: string,
    mimeType: string,
    size: number
}
```

### MessageDeliveryEvent

```typescript

interface MessageDeliveryEvent {
    clientMessageId: string
    deliveryState: 'SERVER' | 'CLIENT'
}
```

### TypingStateChangeEvent

```typescript

interface TypingStateChangeEvent {
    state: string
}
```