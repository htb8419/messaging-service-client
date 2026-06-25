# Messaging Service Client — Complete Rewrite Design

**Date:** 2026-06-25
**Version:** 3.0.0 (target)
**Status:** Approved

## Motivation

Rewrite the `@dms-im/messaging-service` library from scratch to achieve:

- Clean, professional, well-organized code structure
- High readability and simplicity
- Proper separation of concerns
- Full TypeScript with strict mode
- Comprehensive test coverage
- No global window mutations
- Modern tooling (tsup, Vitest, @stomp/stompjs)

## Technology Stack

| Concern | Choice | Reason |
|---------|--------|--------|
| Language | TypeScript 5.x, strict mode | Type safety, better DX for consumers |
| Build | tsup (esbuild) | Fast, native TS, dual ESM+CJS output |
| STOMP | @stomp/stompjs | Standard library, no global dependency |
| WebRTC | webrtc-adapter (shim) | Browser compatibility |
| Testing | Vitest | Fast, TS-native, compatible with project ecosystem |
| Events | Custom TypedEmitter | Type-safe event bus, browser-compatible |

## Public API

### Initialization

```typescript
import { MessagingClient } from '@dms-im/messaging-service'

const client = new MessagingClient({
  serverUrl: 'https://chat.example.com',
  accessToken: 'eyJ...',
  roomId: 'room-123',
  // Optional overrides:
  heartbeatIncoming: 20000,
  heartbeatOutgoing: 20000,
  reconnectDelay: 3000,
  maxReconnectAttempts: 20,
  rtcConfig: {
    iceServers: [
      { urls: 'stun:turn.example.com:5349' },
      { urls: 'turn:turn.example.com:5349', credential: '...', username: '...' }
    ]
  },
  mediaConstraints: {
    video: { width: { min: 384, ideal: 640, max: 1280 }, height: { min: 216, ideal: 360, max: 720 } },
    audio: { echoCancellation: true, noiseSuppression: true }
  }
})
```

### Methods

```typescript
// Connection
await client.connect()
await client.disconnect()

// Messaging
await client.sendMessage(text: string, file?: File)
await client.getRoomMessages(): Promise<ReceivedMessage[]>
await client.getParticipantsState(): Promise<ParticipantState[]>

// Presence & Typing
await client.sendTypingState(state: 'START' | 'STOP')
await client.sendPresence(presence: PresenceState)

// Calling
await client.makeCall()
await client.endCall(forceCloseSession?: boolean)
client.toggleMicrophone(enabled: boolean)
client.toggleCamera(enabled: boolean)

// Files
getFileUrl(fileId: string): string
```

### Events (TypedEmitter + EventType const)

Event nameها به صورت یک آبجکت `const` تعریف می‌شوند — بدون string literal مستقیم:

```typescript
// src/events/EventType.ts
export const EventType = {
  Message:             'message',
  ConnectionChange:    'connection:change',
  CallChange:          'call:change',
  MessageDelivery:     'message:delivery',
  TypingChange:        'typing:change',
  PresenceChange:      'presence:change',
  Error:               'error',
} as const

export type EventType = (typeof EventType)[keyof typeof EventType]
```

```typescript
// مصرف‌کننده — import کن و استفاده کن، بدون string literal
import { MessagingClient, EventType } from '@dms-im/messaging-service'

client.on(EventType.Message, (msg: ReceivedMessage) => {})
client.on(EventType.ConnectionChange, (state: ConnectionStateEvent) => {})
client.on(EventType.CallChange, (state: CallStateEvent) => {})
client.on(EventType.MessageDelivery, (event: DeliveryEvent) => {})
client.on(EventType.TypingChange, (event: TypingEvent) => {})
client.on(EventType.PresenceChange, (event: PresenceEvent) => {})
client.on(EventType.Error, (error: MessagingError) => {})

client.off(EventType.Message, handler)

// ❌ کامپایلر اینا رو رد می‌کنه:
client.on('mesage', () => {})                    // typo in event name
client.on(EventType.Message, (x: number) => {})  // wrong handler type
```

مزایا: autocomplete در IDE، خطای compile-time برای تایپو، type-safe handler parameterها، rename-safe.

Events use namespaced naming (`domain:action`) for clarity:
- `connection:change` — socket state transitions
- `call:change` — WebRTC call lifecycle
- `message:delivery` — server/client delivery confirmations
- `typing:change` / `presence:change` — user states

## Internal Architecture

### Dependency Graph

```
MessagingClient (façade + event bus owner)
 ├── Config              → immutable, validated config
 ├── Auth                → JWT decode, token extraction
 ├── TypedEmitter        → type-safe event bus
 ├── StompConnection     → @stomp/stompjs wrapper
 ├── MessageService      → send message, build payload
 ├── PresenceService     → typing + presence state
 ├── CallService         → WebRTC orchestration
 │    ├── PeerConnection → RTCPeerConnection wrapper
 │    └── MediaManager   → getUserMedia, enumerate devices
 ├── FileService         → upload / get download URL
 └── HttpClient          → fetch wrapper with auth + timeout
```

All services receive their dependencies via constructor injection. No service accesses `window` except `MediaManager` which interacts with `navigator.mediaDevices`.

### Event Flow

```
STOMP message received
  → StompConnection.handleMessage(payload)
    → events.emit('message', payload)
    → events.emit('typing:change', ...)
    → events.emit('call:signal', ...)
    → events.emit('message:delivery', ...)

RTCPeerConnection state change
  → CallService.handleConnectionChange(state)
    → events.emit('call:change', ...)

StompConnection state change
  → events.emit('connection:change', ...)
```

### Connection State Machine

```
IDLE → CONNECTING → CONNECTED
          ↓             ↓
      (retry)     (auto reconnect on drop)
          ↓             ↓
      DISCONNECTED ←─────┘ (max retries exceeded or explicit disconnect)
```

### Message Send Flow

```
client.sendMessage(text, file?)
  → MessageService.send()
    ├── if file: FileService.upload(file) → fileInfo
    ├── MessageBuilder.build({ roomId, text, media })
    └── StompConnection.send('/app/im', payload)
```

### WebRTC Call Flow

```
Caller                          Callee
  makeCall()
    → getUserMedia()
    → create RTCPeerConnection
    → STOMP: CALL_REQUEST  ────→  handleSignal(CALL_REQUEST)
                                     → getUserMedia()
                                     → create RTCPeerConnection
                                     → STOMP: CALL_ACCEPTED
    ←──── STOMP: CALL_ACCEPTED
    → createOffer()
    → STOMP: OFFER  ──────────→  handleSignal(OFFER)
                                     → setRemoteDescription()
                                     → createAnswer()
                                     → STOMP: ANSWER
    ←──── STOMP: ANSWER
    → STOMP: CANDIDATE  ──────→  addIceCandidate()
    ←──── STOMP: CANDIDATE
    ═══ CONNECTED ═══
```

## File Structure

```
src/
├── index.ts                    # Public exports (barrel)
├── MessagingClient.ts          # Main façade
│
├── core/                       # Foundation — no business logic
│   ├── Config.ts               # Options → immutable config
│   ├── Auth.ts                 # JWT decode, session/username extraction
│   ├── HttpClient.ts           # fetch wrapper (auth header, 5s timeout)
│   └── TypedEmitter.ts         # Generic type-safe EventEmitter
│
├── connection/                 # STOMP/WebSocket layer
│   ├── StompConnection.ts      # @stomp/stompjs wrapper, subscriptions
│   └── types.ts
│
├── messaging/                  # Message send/receive
│   ├── MessageService.ts       # Send flow, delivery tracking
│   ├── MessageBuilder.ts       # Payload construction
│   └── types.ts
│
├── calling/                    # WebRTC voice/video
│   ├── CallService.ts          # Call lifecycle, signal handling
│   ├── PeerConnection.ts       # RTCPeerConnection wrapper
│   ├── MediaManager.ts         # getUserMedia, device enumeration
│   └── types.ts
│
├── presence/                   # User state (typing, online/away)
│   ├── PresenceService.ts
│   └── types.ts
│
├── files/                      # File upload/download URLs
│   ├── FileService.ts
│   └── types.ts
│
└── enums/                      # Shared enumerations
    ├── MessageType.ts
    ├── ConnectionState.ts
    ├── CallState.ts
    └── PresenceState.ts
```

Tests mirror `src/` structure under `tests/`.

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files | PascalCase for classes, camelCase otherwise | `StompConnection.ts`, `types.ts` |
| Classes & interfaces | PascalCase | `MessagingClient`, `ReceivedMessage` |
| Type aliases | PascalCase | `ConnectionState`, `EventHandler` |
| Enums (const objects) | PascalCase keys, SCREAMING values | `MessageType.INSTANT` |
| Functions/methods | camelCase | `sendMessage()`, `makeCall()` |
| Private fields | camelCase, no `#` or `_` prefix | `private stompClient` |

One primary export per file. Barrel re-exports only in `index.ts`.

## Test Strategy

- **Framework:** Vitest with jsdom environment (browser APIs)
- **Mocking:** `vi.mock()` for external dependencies (@stomp/stompjs, webrtc-adapter)
- **Coverage target:** ≥80% for core business logic
- **Structure:**
  - Unit tests for each service in isolation (mock constructor deps)
  - Integration tests for `MessagingClient` with mocked STOMP backend
  - WebRTC signal flow tests with mocked RTCPeerConnection

## Migration from v2

The existing API (`initializeApp()`, `window.communicationClient`) is NOT carried forward. This is a breaking change — consumers (`chat-client`) must be updated to use `new MessagingClient()` with the event listener pattern.
