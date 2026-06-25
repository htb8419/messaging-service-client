# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@dms-im/messaging-service` — a browser-side messaging client library published to a private Nexus registry (`https://nexus.demisco.com/repository/dms-npm-repo/`). Provides STOMP-over-WebSocket messaging, WebRTC voice/video calling, file upload, and an event-driven architecture for integrating with chat UIs.

- **Build:** Rollup + Babel + TypeScript (type-check only, no emit) → single ES module `dist/index.es.js`
- **Runtime:** Browser only. Depends on `webrtc-adapter` (shim) and expects the global `window.Stomp` from an external STOMP library.
- **Consumed by:** `chat-client` (React SPA) and potentially other DMS frontends.

## Build & Development Commands

```bash
npm install
npm run build              # Rollup → dist/index.es.js (ES module)
npm run build\&watch       # Rollup in watch mode
npm run create-npm-link    # Build + npm link (for local dev against consumers)
npm run publish            # Publish to private Nexus registry
```

The build transpiles JS/TS sources via Babel (`@babel/preset-env` targeting last 10 versions of Chrome/Firefox/Edge/Safari/iOS).

## Architecture

### Initialization & Global State

The library is initialized via `initializeApp(options)` which:
1. Decodes the JWT `accessToken` via `SecurityContextHolder` → stores `{ accessToken, username, sessionId }` on `window.__messagingSecurityContext`
2. Creates `ApplicationConfig` on `window.$applicationConfig` — merges user options with `_DEFAULT_MESSAGING_SERVICE_OPTIONS` (defaults for socket, WebRTC, connection timeouts)

After initialization, the consuming app creates `new CommunicationClient()` which stores itself as `window.communicationClient` (a singleton accessed by the RTC module via the global).

### Core Classes

| Class | Role |
|-------|------|
| `CommunicationClient` | Main public API. Methods: `sendMessage()`, `sendEvent()`, `makeCall()`, `endCall()`, `changeTypingState()`, `changePresenceState()`, `disconnect()`, `getRoomMessages()`, `getParticipantsState()`. Internally wires up event listeners and delegates to `StompClient`. |
| `StompClient` | STOMP-over-WebSocket connection. Uses global `window.Stomp.client()` to create the STOMP client. Subscribes to `/user/{sessionId}/queue/event` and `/user/{sessionId}/queue/im` on connect. Handles reconnection with max 10 retries, 3s delay. |
| `ApplicationConfig` | Global config singleton (`window.$applicationConfig`). Sets up `fileServiceUrl`, `socketUrl` (HTTP→WS conversion), and provides `getWebRtcConfig()` with default STUN/TURN servers. |
| `SecurityContextHolder` | Stores JWT-derived security context on `window.__messagingSecurityContext`. `initialContext()` must be called before any connection. |
| `CustomEventDispatcher` | Event bus using DOM `CustomEvent` on `window`. Both `dispatchEvent()` and `registerEventListener()` are static — everything flows through `window.dispatchEvent`/`window.addEventListener`. |

### Event Flow

```
STOMP message arrives → StompClient._messageHandler(msg)
  → CustomEventDispatcher.dispatchEvent(RECEIVED_MESSAGE, payload)
  → CommunicationClient._handleAppEvents({type, detail})
    ├── WebRTC events (CALL_REQUEST, OFFER, ANSWER, etc.) → RtcPeerConnection.handleRtcEvents()
    └── Everything else → CommunicationClient._uiCallback(eventType, detail)
          → ApplicationConfig.getConfig().callback(UIEvent, detail)  // bridge to consuming app
```

The `callback` function passed in `initializeApp` options is the single bridge to the consumer — it receives every non-WebRTC event (new messages, typing, presence, connection state).

### Event Types (ApplicationEvents)

Defined in `MessagingEnums.ApplicationEvents`:
- `CONNECTION_STATE_CHANGE` — socket connect/disconnect
- `RECEIVED_MESSAGE` — new IM or event message
- `MESSAGE_DELIVERY` — server/client delivery confirmation
- `TYPING_STATE_CHANGE` / `PRESENCE_STATE_CHANGE` — user state
- `CALL_STATE_CHANGE` — WebRTC call lifecycle
- `THROW_EXCEPTION` — errors

### WebRTC Module (`src/lib/rtc/`)

- `RtcPeerConnection.js` — manages `RTCPeerConnection` lifecycle. Module-level state (`rtcConnection`, `localMediaStream`). Signaling flows through STOMP event messages (`CALL_REQUEST` → `CALL_ACCEPTED` → `OFFER` → `ANSWER` → `CANDIDATE`). Auto-reconnects up to 2 times on disconnect.
- `RtcUtils.js` — media device enumeration. Filters out unavailable video/audio devices before `getUserMedia()`.
- References `communicationClient` as a global (set by `CommunicationClient` constructor → `window.communicationClient`).

### Message Building

`MessageBuilder` creates message payloads with auto-incremented sequence numbers. Messages are either `IM` (instant messages, may include a `media` array) or `EVENT` (typing, presence, delivery, WebRTC signaling). All messages include `room` (roomId), `clientMessageId` (`sessionId.timestamp.sequence`), `isMessageOut: true`.

### HTTP Utilities

- `XhrRequest` — thin wrapper around `fetch` with 5s timeout (AbortController), auto-injected `Authorization: bearer` header, JSON parsing.
- `getRoomInfo(roomCode)` — fetches room info, caches to `window.$imRoomInfo`, re-initializes `SecurityContextHolder` with the participant token from the room.
- `uploadFile(file)` — multipart form POST to `fileServiceUrl`.
- `fileUrl(fileId)` — constructs download URL from `fileServiceUrl`.

### Unused / Dead Code

- `SocketConnection.js` — newer STOMP connection using `@stomp/stompjs` (npm package) instead of global `window.Stomp`. Defined but not imported by any production code. Likely intended to replace `StompClient` but not yet integrated.
- `MessageChanel.js` — queued message sender with 100ms sync interval. Not imported by any production code. Likely an earlier approach superseded by `StompClient.sendMessage()`.
- `MessageQueue.js` — simple FIFO queue used only by `MessageChanel`.
- `MessageValidator.js` — message schema validation. Has broken imports (`../../utils/ApplicationConfig`, `ErrorCodes` from model) and is not imported anywhere.
- `MessageUtil.js` — helper for checking message types; not imported anywhere.

### Source Layout

```
src/
├── index.js                    # Public exports: initializeApp, CommunicationClient, MessagingEnums, getRoomInfo, fileUrl
├── CommunicationClient.js      # Main API class
├── StompClient.js              # STOMP connection (uses global window.Stomp)
├── ApplicationConfig.js        # Global config singleton
├── MessageChanel.js            # [UNUSED] Queued message channel
├── lib/
│   ├── CustomEventDispatcher.js # Event bus on window CustomEvent
│   ├── MessageBuilder.js        # Constructs IM and EVENT message payloads
│   ├── SecurityContextHolder.js # JWT-based auth context
│   ├── XhrRequest.js            # HTTP client (fetch wrapper)
│   ├── uploadFile.js            # File upload to file service
│   ├── getRoomInfo.js           # Room info fetcher
│   ├── getParticipantsState.js  # Participant state fetcher
│   ├── JwtUtil.js               # JWT token decoding
│   ├── fileUrl.js               # File download URL builder
│   ├── SocketConnection.js      # [UNUSED] @stomp/stompjs client
│   ├── MessageValidator.js      # [UNUSED] Schema validator (broken imports)
│   ├── MessageUtil.js           # [UNUSED] Message type helpers
│   ├── Logger.js                # Console wrapper
│   ├── sleep.js                 # Promise-based sleep
│   └── rtc/
│       ├── RtcPeerConnection.js # WebRTC peer connection management
│       └── RtcUtils.js          # Media device detection
├── model/
│   ├── MessagingEnums.js        # All enums: message types, events, RTC states
│   ├── ApplicationErrors.js     # Error definitions (CustomError class)
│   ├── MessageQueue.js          # [UNUSED] FIFO queue
│   └── index.js                 # Re-exports + UIEvents mapping table
├── spec/                        # TypeScript interfaces (documentation, not compiled)
│   ├── ConnectionStateChangeEvent.ts
│   ├── ReceivedMessageEvent.ts
│   ├── MessageDeliveryEvent.ts
│   └── TypingStateChangeEvent.ts
└── i18n/
    └── messages_fa.json         # Persian error messages
```

## Key Conventions

- **JWT tokens** are passed in via `initializeApp({ accessToken })`. The library decodes the JWT client-side to extract `user_name` (used as both username and sessionId) — no server-side session establishment.
- **Global mutation pattern:** The library stores state on `window.$applicationConfig`, `window.__messagingSecurityContext`, `window.$imRoomInfo`, and `window.communicationClient`. This is intentional — the consuming app accesses the client via `window.communicationClient`.
- **ES module only** — the Rollup build outputs ESM format. Consumers must be bundlers that understand ES modules.
- **STOMP dependency is external** — the library expects `window.Stomp` to be available (provided by the consumer's STOMP.js script tag or import). The `@stomp/stompjs` npm package is NOT a dependency — it's only used by the unused `SocketConnection.js`.
- **Error messages** are in Persian (Farsi) via `i18n/messages_fa.json`.
