# Messaging service client
---

## Getting started

### Get roomInfo

```javascript
import {getRoomInfo} from 'messaging-service-client'

let roomInfo = getRoomInfo(roomCode)
```

### Initialize MessageService

```javascript

import {initialMessageService} from 'messaging-service-client'

const messagingOptions = {
    serverUrl: `${SERVER_URL}`,
    accessToken: `${roomInfo.currentParticipant.token}`,
    callback: handleEvent // func(type,detail)
}

initialMessageService(messagingOptions).then(messageService => {
    //do anything
}).catch(this.handleException)
```

___

### send text message

```javascript

messageService.buildTextMessage(roomId, text).then(message => {
    messageService.sendMessage(message)
}).catch(this.handleException)

```

### send file message

```javascript

messageService.buildFileMessage(roomId, fileItem).then(message => {
    messageService.sendMessage(message)
}).catch(this.handleException)

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