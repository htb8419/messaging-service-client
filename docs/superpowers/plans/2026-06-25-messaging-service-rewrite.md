# Messaging Service Client — Complete Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete rewrite of `@dms-im/messaging-service` as a clean, TypeScript-first, professionally-architected messaging library with STOMP/WebSocket and WebRTC support.

**Architecture:** Façade pattern — `MessagingClient` composes independent services (`StompConnection`, `MessageService`, `CallService`, `PresenceService`, `FileService`) with constructor-based DI and a type-safe `TypedEmitter` event bus.

**Tech Stack:** TypeScript 5.x strict, tsup (esbuild), @stomp/stompjs, webrtc-adapter, Vitest + jsdom

## Global Constraints

- TypeScript strict mode — no `any` without explicit reason
- No global window mutations — no `window.$anything`
- One primary export per file; barrel re-exports only in `index.ts`
- All services receive dependencies via constructor injection
- Private fields: camelCase, no `#` or `_` prefix
- Event names: use `EventType` const object, never raw strings
- Test coverage ≥80% for business logic
- Build output: dual ESM + CJS via tsup

---

### Task 1: Project Setup — Dependencies & Config Files

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`
- Delete: `rollup.config.js`, `babel.config.json`

**Interfaces:**
- Produces: Working build toolchain — `npm run build` compiles TS, `npm test` runs Vitest

- [ ] **Step 1: Update package.json**

Replace the entire `package.json` with the new config:

```json
{
  "name": "@dms-im/messaging-service",
  "version": "3.0.0",
  "description": "DMS Instant Messaging client library — STOMP/WebSocket messaging and WebRTC calling",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "build:watch": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "@stomp/stompjs": "^7.0.0",
    "webrtc-adapter": "^8.2.3"
  },
  "devDependencies": {
    "@vitest/coverage-v8": "^1.0.0",
    "jsdom": "^24.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.4.0",
    "vitest": "^1.0.0"
  },
  "publishConfig": {
    "registry": "https://nexus.demisco.com/repository/dms-npm-repo/"
  }
}
```

- [ ] **Step 2: Update tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create tsup.config.ts**

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: 'es2022',
})
```

- [ ] **Step 4: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
})
```

- [ ] **Step 5: Delete old build config files**

```bash
rm rollup.config.js babel.config.json
```

- [ ] **Step 6: Install dependencies and verify setup**

```bash
npm install
npx tsup --version
npx vitest --version
npx tsc --noEmit 2>&1 | head -5  # Should show no errors (no src files yet)
```

Expected: All commands succeed. TypeScript reports "No inputs were found" (we haven't created src files yet).

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json tsup.config.ts vitest.config.ts
git add rollup.config.js babel.config.json  # deleted
git commit -m "chore: set up project toolchain for v3 rewrite

- Replace Rollup+Babel with tsup (esbuild)
- Add Vitest + jsdom for testing
- Add @stomp/stompjs dependency
- Update TypeScript to strict modern config
- Dual ESM+CJS output"
```

---

### Task 2: Core Layer — TypedEmitter, Config, Auth, HttpClient

**Files:**
- Create: `src/core/TypedEmitter.ts`
- Create: `src/core/Config.ts`
- Create: `src/core/Auth.ts`
- Create: `src/core/HttpClient.ts`
- Create: `tests/core/TypedEmitter.test.ts`
- Create: `tests/core/Config.test.ts`
- Create: `tests/core/Auth.test.ts`
- Create: `tests/core/HttpClient.test.ts`

**Interfaces:**
- Produces:
  - `TypedEmitter<T>` — generic class with `on<K>(event: K, handler: T[K])`, `off<K>(event: K, handler: T[K])`, `emit<K>(event: K, ...args: Parameters<T[K]>)`
  - `Config` — class taking `MessagingOptions`, producing immutable config with `serverUrl`, `socketUrl`, `fileServiceUrl`, `roomId`, STOMP settings, RTC settings
  - `Auth` — class taking `accessToken`, exposing `username`, `sessionId`, `accessToken`
  - `HttpClient` — class with `get<T>(path, headers?)`, `post<T>(path, data?, headers?)`, auto-injects auth header + 5s timeout
- Consumes: Nothing (foundation layer)

- [ ] **Step 1: Write TypedEmitter tests**

```typescript
// tests/core/TypedEmitter.test.ts
import { describe, it, expect, vi } from 'vitest'
import { TypedEmitter } from '../../src/core/TypedEmitter'

type TestEvents = {
  foo: (x: number) => void
  bar: (msg: string, flag: boolean) => void
}

describe('TypedEmitter', () => {
  it('registers and calls a handler', () => {
    const emitter = new TypedEmitter<TestEvents>()
    const handler = vi.fn()
    emitter.on('foo', handler)
    emitter.emit('foo', 42)
    expect(handler).toHaveBeenCalledWith(42)
  })

  it('calls multiple handlers for the same event', () => {
    const emitter = new TypedEmitter<TestEvents>()
    const h1 = vi.fn()
    const h2 = vi.fn()
    emitter.on('foo', h1)
    emitter.on('foo', h2)
    emitter.emit('foo', 99)
    expect(h1).toHaveBeenCalledWith(99)
    expect(h2).toHaveBeenCalledWith(99)
  })

  it('removes a handler via off()', () => {
    const emitter = new TypedEmitter<TestEvents>()
    const handler = vi.fn()
    emitter.on('foo', handler)
    emitter.off('foo', handler)
    emitter.emit('foo', 1)
    expect(handler).not.toHaveBeenCalled()
  })

  it('emitting with no handlers does not throw', () => {
    const emitter = new TypedEmitter<TestEvents>()
    expect(() => emitter.emit('bar', 'test', true)).not.toThrow()
  })

  it('passes multiple arguments to handler', () => {
    const emitter = new TypedEmitter<TestEvents>()
    const handler = vi.fn()
    emitter.on('bar', handler)
    emitter.emit('bar', 'hello', false)
    expect(handler).toHaveBeenCalledWith('hello', false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/core/TypedEmitter.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement TypedEmitter**

```typescript
// src/core/TypedEmitter.ts
export class TypedEmitter<T extends Record<string, (...args: any[]) => void>> {
  private handlers = new Map<keyof T, Set<T[keyof T]>>()

  on<K extends keyof T>(event: K, handler: T[K]): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler)
  }

  off<K extends keyof T>(event: K, handler: T[K]): void {
    this.handlers.get(event)?.delete(handler)
  }

  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): void {
    this.handlers.get(event)?.forEach(handler => {
      (handler as (...a: Parameters<T[K]>) => void)(...args)
    })
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/core/TypedEmitter.test.ts
```
Expected: 5 tests PASS

- [ ] **Step 5: Write Config tests**

```typescript
// tests/core/Config.test.ts
import { describe, it, expect } from 'vitest'
import { Config, type MessagingOptions } from '../../src/core/Config'

const baseOptions: MessagingOptions = {
  serverUrl: 'https://chat.example.com',
  accessToken: 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX25hbWUiOiJ1c2VyMSJ9.xxx',
  roomId: 'room-123',
}

describe('Config', () => {
  it('sets serverUrl and fileServiceUrl from serverUrl', () => {
    const config = new Config(baseOptions)
    expect(config.serverUrl).toBe('https://chat.example.com')
    expect(config.fileServiceUrl).toBe('https://chat.example.com/fs/file')
  })

  it('converts https:// serverUrl to wss:// socketUrl', () => {
    const config = new Config(baseOptions)
    expect(config.socketUrl).toBe('wss://chat.example.com/ws-adapter')
  })

  it('converts http:// serverUrl to ws:// socketUrl', () => {
    const config = new Config({ ...baseOptions, serverUrl: 'http://localhost:8080' })
    expect(config.socketUrl).toBe('ws://localhost:8080/ws-adapter')
  })

  it('stores roomId', () => {
    const config = new Config(baseOptions)
    expect(config.roomId).toBe('room-123')
  })

  it('applies default heartbeat values when not provided', () => {
    const config = new Config(baseOptions)
    expect(config.heartbeatIncoming).toBe(20000)
    expect(config.heartbeatOutgoing).toBe(20000)
  })

  it('uses provided heartbeat overrides', () => {
    const config = new Config({ ...baseOptions, heartbeatIncoming: 5000, heartbeatOutgoing: 5000 })
    expect(config.heartbeatIncoming).toBe(5000)
    expect(config.heartbeatOutgoing).toBe(5000)
  })

  it('provides default RTC config with iceServers', () => {
    const config = new Config(baseOptions)
    expect(config.rtcConfig.iceServers).toBeDefined()
    expect(config.rtcConfig.iceServers!.length).toBeGreaterThan(0)
  })

  it('merges provided rtcConfig with defaults', () => {
    const config = new Config({
      ...baseOptions,
      rtcConfig: { iceServers: [{ urls: 'stun:custom:3478' }] },
    })
    expect(config.rtcConfig.iceServers).toEqual([{ urls: 'stun:custom:3478' }])
  })

  it('provides default media constraints', () => {
    const config = new Config(baseOptions)
    expect(config.mediaConstraints.video).toBeDefined()
    expect(config.mediaConstraints.audio).toBeDefined()
  })

  it('throws when serverUrl is missing', () => {
    expect(() => new Config({ ...baseOptions, serverUrl: '' })).toThrow()
  })
})
```

- [ ] **Step 6: Implement Config**

```typescript
// src/core/Config.ts
export interface RtcIceServer {
  urls: string
  credential?: string
  username?: string
}

export interface RtcConfig {
  iceServers?: RtcIceServer[]
}

export interface MediaConstraints {
  video?: MediaTrackConstraints | boolean
  audio?: MediaTrackConstraints | boolean
}

export interface MessagingOptions {
  serverUrl: string
  accessToken: string
  roomId: string
  heartbeatIncoming?: number
  heartbeatOutgoing?: number
  reconnectDelay?: number
  maxReconnectAttempts?: number
  rtcConfig?: RtcConfig
  mediaConstraints?: MediaConstraints
}

const DEFAULT_RTC_CONFIG: Required<RtcConfig> = {
  iceServers: [
    { urls: 'stun:turn.demisco.com:5349' },
    { urls: 'turn:turn.demisco.com:5349', credential: 'turn', username: 'turn' },
  ],
}

const DEFAULT_MEDIA_CONSTRAINTS: MediaConstraints = {
  video: {
    width: { min: 384, ideal: 640, max: 1280 },
    height: { min: 216, ideal: 360, max: 720 },
    frameRate: { min: 16, max: 24 },
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
  },
}

export class Config {
  readonly serverUrl: string
  readonly socketUrl: string
  readonly fileServiceUrl: string
  readonly roomId: string
  readonly heartbeatIncoming: number
  readonly heartbeatOutgoing: number
  readonly reconnectDelay: number
  readonly maxReconnectAttempts: number
  readonly rtcConfig: Required<RtcConfig>
  readonly mediaConstraints: MediaConstraints

  constructor(options: MessagingOptions) {
    if (!options.serverUrl) {
      throw new Error('serverUrl is required')
    }

    this.serverUrl = options.serverUrl
    this.fileServiceUrl = `${options.serverUrl}/fs/file`
    this.socketUrl = options.serverUrl.startsWith('https://')
      ? options.serverUrl.replace('https://', 'wss://') + '/ws-adapter'
      : options.serverUrl.replace('http://', 'ws://') + '/ws-adapter'

    this.roomId = options.roomId
    this.heartbeatIncoming = options.heartbeatIncoming ?? 20000
    this.heartbeatOutgoing = options.heartbeatOutgoing ?? 20000
    this.reconnectDelay = options.reconnectDelay ?? 3000
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 20

    this.rtcConfig = {
      iceServers: options.rtcConfig?.iceServers ?? DEFAULT_RTC_CONFIG.iceServers,
    }
    this.mediaConstraints = options.mediaConstraints ?? DEFAULT_MEDIA_CONSTRAINTS
  }
}
```

- [ ] **Step 7: Run Config tests**

```bash
npx vitest run tests/core/Config.test.ts
```
Expected: all PASS

- [ ] **Step 8: Write Auth tests**

```typescript
// tests/core/Auth.test.ts
import { describe, it, expect } from 'vitest'
import { Auth } from '../../src/core/Auth'

// A valid JWT with payload: { "user_name": "user1" }
const tokenParts = {
  header: btoa(JSON.stringify({ alg: 'HS256' })),
  payload: btoa(JSON.stringify({ user_name: 'user1' })),
  signature: 'fake-sig',
}
const validToken = `${tokenParts.header}.${tokenParts.payload}.${tokenParts.signature}`

describe('Auth', () => {
  it('extracts username from JWT', () => {
    const auth = new Auth(validToken)
    expect(auth.username).toBe('user1')
  })

  it('uses username as sessionId', () => {
    const auth = new Auth(validToken)
    expect(auth.sessionId).toBe('user1')
  })

  it('stores accessToken', () => {
    const auth = new Auth(validToken)
    expect(auth.accessToken).toBe(validToken)
  })

  it('throws on invalid token format', () => {
    expect(() => new Auth('not-a-jwt')).toThrow()
  })

  it('throws when user_name is missing from payload', () => {
    const badPayload = btoa(JSON.stringify({ sub: 'x' }))
    const badToken = `${tokenParts.header}.${badPayload}.${tokenParts.signature}`
    expect(() => new Auth(badToken)).toThrow()
  })
})
```

- [ ] **Step 9: Implement Auth**

```typescript
// src/core/Auth.ts
export class Auth {
  readonly username: string
  readonly sessionId: string
  readonly accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
    const userInfo = Auth.decodePayload(accessToken)

    if (!userInfo.user_name) {
      throw new Error('JWT payload must contain user_name')
    }

    this.username = userInfo.user_name
    this.sessionId = userInfo.user_name
  }

  private static decodePayload(token: string): Record<string, unknown> {
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format')
    }
    try {
      return JSON.parse(atob(parts[1]!))
    } catch {
      throw new Error('Invalid JWT payload encoding')
    }
  }
}
```

- [ ] **Step 10: Run Auth tests**

```bash
npx vitest run tests/core/Auth.test.ts
```
Expected: all PASS

- [ ] **Step 11: Write HttpClient tests using fetch mock**

```typescript
// tests/core/HttpClient.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { HttpClient } from '../../src/core/HttpClient'

describe('HttpClient', () => {
  let http: HttpClient
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    http = new HttpClient('https://api.example.com', 'token-abc')
  })

  it('GET request includes auth header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ payload: { id: 1 } }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await http.get<{ id: number }>('/test')
    expect(result).toEqual({ id: 1 })
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/test',
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: 'bearer token-abc' },
      })
    )
  })

  it('POST request sends JSON body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ payload: 'ok' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await http.post('/submit', { key: 'value' })
    const call = mockFetch.mock.calls[0]
    const body = JSON.parse(call[1].body)
    expect(body).toEqual({ key: 'value' })
  })

  it('aborts after 5 second timeout', async () => {
    vi.useFakeTimers()
    const mockFetch = vi.fn().mockImplementation((_url, opts) => {
      return new Promise((_, reject) => {
        opts.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      })
    })
    vi.stubGlobal('fetch', mockFetch)

    const promise = http.get('/test')
    vi.advanceTimersByTime(5000)
    await expect(promise).rejects.toThrow()

    vi.useRealTimers()
  })

  it('throws on non-200 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }))

    await expect(http.get('/test')).rejects.toThrow('Access Denied')
  })

  it('extracts payload from wrapped response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ payload: { data: 'result' } }),
    }))

    const result = await http.get('/test')
    expect(result).toEqual({ data: 'result' })
  })

  it('returns raw response when no payload key', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 'direct' }),
    }))

    const result = await http.get('/test')
    expect(result).toEqual({ id: 'direct' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })
})
```

- [ ] **Step 12: Implement HttpClient**

```typescript
// src/core/HttpClient.ts
export class HttpClient {
  constructor(
    private readonly baseUrl: string,
    private readonly accessToken: string,
  ) {}

  async get<T = unknown>(path: string, headers: Record<string, string> = {}): Promise<T> {
    return this.request<T>(path, 'GET', undefined, headers)
  }

  async post<T = unknown>(path: string, data?: unknown, headers: Record<string, string> = {}): Promise<T> {
    return this.request<T>(path, 'POST', data, headers)
  }

  private async request<T>(
    path: string,
    method: string,
    data?: unknown,
    extraHeaders: Record<string, string> = {},
  ): Promise<T> {
    const url = path.startsWith('/') ? `${this.baseUrl}${path}` : path

    const headers: Record<string, string> = {
      Authorization: `bearer ${this.accessToken}`,
      ...extraHeaders,
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const fetchOptions: RequestInit = {
        method,
        headers,
        credentials: 'include',
        signal: controller.signal,
      }

      if (method === 'POST' && data !== undefined) {
        const contentType = headers['content-type'] || ''
        fetchOptions.body = contentType === 'application/json'
          ? JSON.stringify(data)
          : data as BodyInit
      }

      const response = await fetch(url, fetchOptions)

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Access Denied')
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const json = await response.json() as { payload?: T; messages?: unknown[] }
      const errors = json.messages
      if (Array.isArray(errors) && errors.length > 0) {
        throw errors[0]
      }

      return json.payload !== undefined ? json.payload : json as T
    } finally {
      clearTimeout(timeoutId)
    }
  }
}
```

- [ ] **Step 13: Run HttpClient tests**

```bash
npx vitest run tests/core/HttpClient.test.ts
```
Expected: all PASS

- [ ] **Step 14: Commit**

```bash
git add src/core/ tests/core/
git commit -m "feat: add core layer — TypedEmitter, Config, Auth, HttpClient"
```

---

### Task 3: Shared Enums & Event Types

**Files:**
- Create: `src/enums/MessageType.ts`
- Create: `src/enums/ConnectionState.ts`
- Create: `src/enums/CallState.ts`
- Create: `src/enums/PresenceState.ts`
- Create: `src/events/EventType.ts`
- Create: `src/events/types.ts`

**Interfaces:**
- Produces: All shared type definitions used across services
- Consumes: Nothing (pure types/enums)

- [ ] **Step 1: Create enums**

```typescript
// src/enums/MessageType.ts
export const MessageType = {
  INSTANT: 'IM',
  EVENT: 'EVENT',
} as const

export type MessageType = (typeof MessageType)[keyof typeof MessageType]
```

```typescript
// src/enums/ConnectionState.ts
export const ConnectionState = {
  IDLE: 'IDLE',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
} as const

export type ConnectionState = (typeof ConnectionState)[keyof typeof ConnectionState]
```

```typescript
// src/enums/CallState.ts
export const CallState = {
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
  END_CALL: 'END_CALL',
} as const

export type CallState = (typeof CallState)[keyof typeof CallState]
```

```typescript
// src/enums/PresenceState.ts
export const PresenceState = {
  ONLINE: 'ONLINE',
  AWAY: 'AWAY',
  BUSY: 'BUSY',
  OFFLINE: 'OFFLINE',
} as const

export type PresenceState = (typeof PresenceState)[keyof typeof PresenceState]
```

```typescript
// src/enums/TypingState.ts
export const TypingState = {
  START: 'START_TYPING',
  STOP: 'STOP_TYPING',
} as const

export type TypingState = (typeof TypingState)[keyof typeof TypingState]
```

- [ ] **Step 2: Create EventType and event interfaces**

```typescript
// src/events/EventType.ts
export const EventType = {
  Message:           'message',
  ConnectionChange:  'connection:change',
  CallChange:        'call:change',
  MessageDelivery:   'message:delivery',
  TypingChange:      'typing:change',
  PresenceChange:    'presence:change',
  Error:             'error',
} as const

export type EventType = (typeof EventType)[keyof typeof EventType]
```

```typescript
// src/events/types.ts
import type { ConnectionState } from '../enums/ConnectionState'
import type { CallState } from '../enums/CallState'
import type { PresenceState } from '../enums/PresenceState'

export interface ConnectionStateEvent {
  state: ConnectionState
  connected: boolean
}

export interface ReceivedMessage {
  room: string
  from: string
  createdAt: string
  clientMessageId: string
  messageType: string
  text?: string
  media?: MediaAttachment[]
}

export interface MediaAttachment {
  fileId: string
  name: string
  mimeType: string
  size: number
}

export interface MessageDeliveryEvent {
  clientMessageId: string
  deliveryState: 'SERVER' | 'CLIENT'
}

export interface TypingEvent {
  state: 'START_TYPING' | 'STOP_TYPING'
  from: string
}

export interface PresenceEvent {
  presence: PresenceState
  from: string
}

export interface CallStateEvent {
  state: CallState
}

export interface OutgoingMessage {
  messageType: string
  room: string
  clientMessageId: string
  text?: string
  media?: MediaAttachment[]
  type?: string
  state?: string
  rtcObject?: unknown
  presence?: string
}

export interface MessagingError extends Error {
  code?: string
  blocking: boolean
}

export interface MessagingEventMap {
  'message':            (msg: ReceivedMessage) => void
  'connection:change':  (state: ConnectionStateEvent) => void
  'call:change':        (state: CallStateEvent) => void
  'message:delivery':   (event: MessageDeliveryEvent) => void
  'typing:change':      (event: TypingEvent) => void
  'presence:change':    (event: PresenceEvent) => void
  'error':              (error: MessagingError) => void
}

// STOMP subscription destination URLs
export const StompDestinations = {
  EVENT: (sessionId: string) => `/user/${sessionId}/queue/event`,
  IM: (sessionId: string) => `/user/${sessionId}/queue/im`,
  SEND_EVENT: '/app/event',
  SEND_IM: '/app/im',
} as const
```

- [ ] **Step 3: Commit**

```bash
git add src/enums/ src/events/
git commit -m "feat: add shared enums and event type definitions"
```

---

### Task 4: StompConnection — STOMP/WebSocket Layer

**Files:**
- Create: `src/connection/types.ts`
- Create: `src/connection/StompConnection.ts`
- Create: `tests/connection/StompConnection.test.ts`

**Interfaces:**
- Consumes: `Config`, `Auth`, `TypedEmitter`, `ConnectionState`, `EventType`, event types, `StompDestinations`
- Produces: `StompConnection` — `connect()`, `disconnect()`, `send(destination, headers, body)`, exposes connection state

- [ ] **Step 1: Create connection types**

```typescript
// src/connection/types.ts
export interface StompSubscription {
  destination: string
  unsubscribe: () => void
}

export interface StompSendHeaders {
  sent: string  // ISO timestamp
  'content-type': string
}
```

- [ ] **Step 2: Write StompConnection tests**

```typescript
// tests/connection/StompConnection.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StompConnection } from '../../src/connection/StompConnection'
import { Config, type MessagingOptions } from '../../src/core/Config'
import { Auth } from '../../src/core/Auth'
import { TypedEmitter } from '../../src/core/TypedEmitter'
import { ConnectionState } from '../../src/enums/ConnectionState'
import { EventType } from '../../src/events/EventType'
import type { MessagingEventMap } from '../../src/events/types'

// Mock @stomp/stompjs
vi.mock('@stomp/stompjs', () => ({
  Client: vi.fn().mockImplementation(() => ({
    activate: vi.fn(),
    deactivate: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    publish: vi.fn(),
    onConnect: undefined as unknown,
    onDisconnect: undefined as unknown,
    onStompError: undefined as unknown,
    onWebSocketClose: undefined as unknown,
    connected: false,
  })),
}))

const mockOptions: MessagingOptions = {
  serverUrl: 'https://chat.example.com',
  accessToken: btoa(JSON.stringify({ alg: 'HS256' })) + '.' + btoa(JSON.stringify({ user_name: 'user1' })) + '.sig',
  roomId: 'room-1',
}

describe('StompConnection', () => {
  let connection: StompConnection
  let config: Config
  let auth: Auth
  let events: TypedEmitter<MessagingEventMap>

  beforeEach(() => {
    vi.clearAllMocks()
    config = new Config(mockOptions)
    auth = new Auth(mockOptions.accessToken)
    events = new TypedEmitter<MessagingEventMap>()
    connection = new StompConnection(config, auth, events)
  })

  it('starts in IDLE state', () => {
    expect(connection.state).toBe(ConnectionState.IDLE)
  })

  it('connect() activates the STOMP client', () => {
    const activateSpy = vi.spyOn(connection['stompClient'], 'activate')
    connection.connect()
    expect(activateSpy).toHaveBeenCalled()
  })

  it('disconnect() deactivates the STOMP client', async () => {
    const deactivateSpy = vi.spyOn(connection['stompClient'], 'deactivate')
    await connection.disconnect()
    expect(deactivateSpy).toHaveBeenCalled()
    expect(connection.state).toBe(ConnectionState.DISCONNECTED)
  })

  it('emits connection:change on connect callback', () => {
    const handler = vi.fn()
    events.on(EventType.ConnectionChange, handler)
    connection.connect()
    // Simulate STOMP onConnect callback
    const onConnect = connection['stompClient'].onConnect as unknown as () => void
    onConnect()
    expect(handler).toHaveBeenCalledWith({
      state: ConnectionState.CONNECTED,
      connected: true,
    })
  })

  it('send() publishes to STOMP destination', () => {
    const publishSpy = vi.spyOn(connection['stompClient'], 'publish')
    connection['stompClient'].connected = true
    connection.send('/app/im', { 'content-type': 'application/json' }, JSON.stringify({ text: 'hi' }))
    expect(publishSpy).toHaveBeenCalledWith({
      destination: '/app/im',
      headers: expect.objectContaining({ 'content-type': 'application/json' }),
      body: JSON.stringify({ text: 'hi' }),
    })
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run tests/connection/StompConnection.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 4: Implement StompConnection**

```typescript
// src/connection/StompConnection.ts
import { Client as StompClient } from '@stomp/stompjs'
import type { Config } from '../core/Config'
import type { Auth } from '../core/Auth'
import { TypedEmitter } from '../core/TypedEmitter'
import { ConnectionState } from '../enums/ConnectionState'
import { EventType } from '../events/EventType'
import { StompDestinations } from '../events/types'
import type {
  MessagingEventMap,
  ConnectionStateEvent,
  ReceivedMessage,
  MessageDeliveryEvent,
  TypingEvent,
  PresenceEvent,
} from '../events/types'

export class StompConnection {
  private readonly stompClient: StompClient
  private _state: ConnectionState = ConnectionState.IDLE
  private retryCount = 0

  constructor(
    private readonly config: Config,
    private readonly auth: Auth,
    private readonly events: TypedEmitter<MessagingEventMap>,
  ) {
    const brokerURL = `${config.socketUrl}/websocket?access_token=${auth.accessToken}&sid=${auth.sessionId}`

    this.stompClient = new StompClient({
      brokerURL,
      debug: (msg: string) => console.debug('$stomp', msg),
      connectionTimeout: 5000,
      reconnectDelay: config.reconnectDelay,
      heartbeatIncoming: config.heartbeatIncoming,
      heartbeatOutgoing: config.heartbeatOutgoing,
    })

    this.stompClient.onConnect = () => {
      this.retryCount = 0
      this.setState(ConnectionState.CONNECTED)
      this.subscribe()
    }

    this.stompClient.onDisconnect = () => {
      this.setState(ConnectionState.DISCONNECTED)
    }

    this.stompClient.onStompError = (frame) => {
      console.error('STOMP error:', frame.headers['message'])
      this.events.emit(EventType.Error, {
        code: 'STOMP_ERROR',
        message: frame.headers['message'] || 'STOMP protocol error',
        blocking: true,
      } as MessagingError)
    }

    this.stompClient.onWebSocketClose = () => {
      if (this.retryCount >= this.config.maxReconnectAttempts) {
        this.setState(ConnectionState.DISCONNECTED)
      }
    }
  }

  get state(): ConnectionState {
    return this._state
  }

  connect(): void {
    if (this._state === ConnectionState.CONNECTED) return
    this.setState(ConnectionState.CONNECTING)
    this.stompClient.activate()
  }

  async disconnect(): Promise<void> {
    await this.stompClient.deactivate()
    this.setState(ConnectionState.DISCONNECTED)
  }

  send(destination: string, headers: Record<string, string>, body: string): void {
    this.stompClient.publish({ destination, headers, body })
  }

  private subscribe(): void {
    const sid = this.auth.sessionId
    const handler = (message: { body: string; ack: () => void }) => {
      message.ack()
      const payload = JSON.parse(message.body) as {
        messageType?: string
        type?: string
        state?: string
        presence?: string
        deliveryState?: 'SERVER' | 'CLIENT'
        clientMessageId?: string
        room?: string
        from?: string
        createdAt?: string
        text?: string
        media?: unknown[]
      }

      this.dispatchMessage(payload)
    }

    this.stompClient.subscribe(StompDestinations.EVENT(sid), handler, { ack: 'client' })
    this.stompClient.subscribe(StompDestinations.IM(sid), handler, { ack: 'client' })
  }

  private dispatchMessage(payload: Record<string, unknown>): void {
    const messageType = payload.messageType as string | undefined

    if (messageType === 'EVENT') {
      const eventType = payload.type as string | undefined
      if (eventType === 'TYPING') {
        this.events.emit(EventType.TypingChange, {
          state: (payload.state as 'START_TYPING' | 'STOP_TYPING') || 'STOP_TYPING',
          from: payload.from as string || '',
        })
      } else if (eventType === 'PRESENCE') {
        this.events.emit(EventType.PresenceChange, {
          presence: (payload.presence as PresenceEvent['presence']) || 'OFFLINE',
          from: payload.from as string || '',
        })
      } else if (eventType === 'DELIVERY') {
        this.events.emit(EventType.MessageDelivery, {
          clientMessageId: payload.clientMessageId as string || '',
          deliveryState: (payload.deliveryState as 'SERVER' | 'CLIENT') || 'SERVER',
        })
      } else if (eventType === 'WRTC') {
        // WebRTC signals go to CallService via the message event with type WRTC
        // They are emitted as a 'message' event with rtc data so CallService can handle them
        this.events.emit(EventType.Message, payload as unknown as ReceivedMessage)
      }
    } else {
      this.events.emit(EventType.Message, payload as unknown as ReceivedMessage)
    }
  }

  private setState(state: ConnectionState): void {
    this._state = state
    this.events.emit(EventType.ConnectionChange, {
      state,
      connected: state === ConnectionState.CONNECTED,
    } as ConnectionStateEvent)
  }
}

// Re-export for typing elsewhere
export type { MessagingError } from '../events/types'
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/connection/StompConnection.test.ts
```
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add src/connection/ tests/connection/
git commit -m "feat: add StompConnection — @stomp/stompjs wrapper with subscriptions"
```

---

### Task 5: MessageService + MessageBuilder — Messaging Layer

**Files:**
- Create: `src/messaging/types.ts`
- Create: `src/messaging/MessageBuilder.ts`
- Create: `src/messaging/MessageService.ts`
- Create: `tests/messaging/MessageBuilder.test.ts`
- Create: `tests/messaging/MessageService.test.ts`

**Interfaces:**
- Consumes: `StompConnection`, `Config`, `Auth`, `MessageType`, `StompDestinations`, `OutgoingMessage`
- Produces: `MessageService` — `sendMessage(text, file?)`, `sendTypingState(state)`, `sendPresence(presence)`, `sendDeliveryAck(msgId, state)`, `sendRtcSignal(state, rtcObject)`, `sendEvent(type, payload)`
  - `MessageBuilder` — `buildMessage(...)`, `buildEvent(...)`

- [ ] **Step 1: Create messaging types**

```typescript
// src/messaging/types.ts
export interface FileInfo {
  fileId: string
  name: string
  mimeType: string
  size: number
}
```

- [ ] **Step 2: Write MessageBuilder tests**

```typescript
// tests/messaging/MessageBuilder.test.ts
import { describe, it, expect } from 'vitest'
import { MessageBuilder } from '../../src/messaging/MessageBuilder'

describe('MessageBuilder', () => {
  const builder = new MessageBuilder('session-1')

  it('builds a basic instant message', async () => {
    const msg = await builder.buildMessage('room-1', 'IM', { text: 'hello' })
    expect(msg.messageType).toBe('IM')
    expect(msg.room).toBe('room-1')
    expect(msg.text).toBe('hello')
    expect(msg.clientMessageId).toMatch(/^session-1\.\d+\.1$/)
  })

  it('increments sequence number per message', async () => {
    const msg1 = await builder.buildMessage('room-1', 'IM', { text: 'a' })
    const msg2 = await builder.buildMessage('room-1', 'IM', { text: 'b' })
    expect(msg1.clientMessageId).toMatch(/\.\d+\.\d+$/)
    expect(msg2.clientMessageId).toMatch(/\.\d+\.\d+$/)
    const seq1 = msg1.clientMessageId.split('.').pop()
    const seq2 = msg2.clientMessageId.split('.').pop()
    expect(Number(seq2)).toBeGreaterThan(Number(seq1))
  })

  it('builds event message with type', async () => {
    const msg = await builder.buildEvent('room-1', 'TYPING', { state: 'START_TYPING' })
    expect(msg.messageType).toBe('EVENT')
    expect(msg.type).toBe('TYPING')
    expect(msg.state).toBe('START_TYPING')
  })

  it('throws when room id is empty', async () => {
    await expect(builder.buildMessage('', 'IM', { text: 'x' })).rejects.toThrow('room is required')
  })
})
```

- [ ] **Step 3: Implement MessageBuilder**

```typescript
// src/messaging/MessageBuilder.ts
import type { OutgoingMessage, MediaAttachment } from '../events/types'

export class MessageBuilder {
  private sequenceNumber = 1

  constructor(private readonly sessionId: string) {}

  buildMessage(
    roomId: string,
    messageType: string,
    payload: Record<string, unknown>,
  ): Promise<OutgoingMessage> {
    if (!roomId) {
      throw new Error('room is required')
    }
    const messageId = `${this.sessionId}.${Date.now()}.${this.sequenceNumber++}`
    return Promise.resolve({
      messageType,
      room: roomId,
      clientMessageId: messageId,
      ...payload,
    } as OutgoingMessage)
  }

  buildEvent(
    roomId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<OutgoingMessage> {
    return this.buildMessage(roomId, 'EVENT', {
      type: eventType,
      ...payload,
    })
  }
}
```

- [ ] **Step 4: Run MessageBuilder tests**

```bash
npx vitest run tests/messaging/MessageBuilder.test.ts
```
Expected: all PASS

- [ ] **Step 5: Write MessageService tests**

```typescript
// tests/messaging/MessageService.test.ts
import { describe, it, expect, vi } from 'vitest'
import { MessageService } from '../../src/messaging/MessageService'
import { StompConnection } from '../../src/connection/StompConnection'
import { Config, type MessagingOptions } from '../../src/core/Config'
import { Auth } from '../../src/core/Auth'
import { TypedEmitter } from '../../src/core/TypedEmitter'
import type { MessagingEventMap } from '../../src/events/types'

vi.mock('@stomp/stompjs', () => ({
  Client: vi.fn().mockImplementation(() => ({
    activate: vi.fn(),
    deactivate: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    publish: vi.fn(),
    onConnect: undefined,
    onDisconnect: undefined,
    onStompError: undefined,
    onWebSocketClose: undefined,
    connected: false,
  })),
}))

const token = btoa(JSON.stringify({ alg: 'HS256' })) + '.' + btoa(JSON.stringify({ user_name: 'user1' })) + '.sig'
const options: MessagingOptions = { serverUrl: 'https://x.com', accessToken: token, roomId: 'room-1' }

describe('MessageService', () => {
  let service: MessageService
  let connection: StompConnection

  beforeEach(() => {
    vi.clearAllMocks()
    const config = new Config(options)
    const auth = new Auth(token)
    const events = new TypedEmitter<MessagingEventMap>()
    connection = new StompConnection(config, auth, events)
    service = new MessageService(connection, config, auth)
  })

  it('sendMessage publishes to /app/im', async () => {
    const sendSpy = vi.spyOn(connection, 'send')
    await service.sendMessage('hello world')
    expect(sendSpy).toHaveBeenCalled()
    const [dest, headers, body] = sendSpy.mock.calls[0]
    expect(dest).toBe('/app/im')
    const parsed = JSON.parse(body!)
    expect(parsed.text).toBe('hello world')
    expect(parsed.messageType).toBe('IM')
    expect(parsed.room).toBe('room-1')
  })

  it('sendTypingState publishes START_TYPING event', async () => {
    const sendSpy = vi.spyOn(connection, 'send')
    await service.sendTypingState('START')
    const [dest, , body] = sendSpy.mock.calls[0]
    expect(dest).toBe('/app/event')
    const parsed = JSON.parse(body!)
    expect(parsed.type).toBe('TYPING')
    expect(parsed.state).toBe('START_TYPING')
  })

  it('sendPresence publishes presence event', async () => {
    const sendSpy = vi.spyOn(connection, 'send')
    await service.sendPresence('ONLINE')
    const [dest, , body] = sendSpy.mock.calls[0]
    expect(dest).toBe('/app/event')
    const parsed = JSON.parse(body!)
    expect(parsed.type).toBe('PRESENCE')
    expect(parsed.presence).toBe('ONLINE')
  })

  it('sendRtcSignal publishes WRTC event', async () => {
    const sendSpy = vi.spyOn(connection, 'send')
    await service.sendRtcSignal('CALL_REQUEST', {})
    const [dest, , body] = sendSpy.mock.calls[0]
    expect(dest).toBe('/app/event')
    const parsed = JSON.parse(body!)
    expect(parsed.type).toBe('WRTC')
    expect(parsed.state).toBe('CALL_REQUEST')
  })
})
```

- [ ] **Step 6: Implement MessageService**

```typescript
// src/messaging/MessageService.ts
import type { StompConnection } from '../connection/StompConnection'
import type { Config } from '../core/Config'
import type { Auth } from '../core/Auth'
import { MessageBuilder } from './MessageBuilder'
import { StompDestinations } from '../events/types'
import type { TypingState } from '../enums/TypingState'

export class MessageService {
  private readonly builder: MessageBuilder

  constructor(
    private readonly connection: StompConnection,
    private readonly config: Config,
    auth: Auth,
  ) {
    this.builder = new MessageBuilder(auth.sessionId)
  }

  async sendMessage(text: string, file?: File): Promise<void> {
    const payload = { text }

    if (file) {
      throw new Error('File upload not yet implemented — use FileService.upload() first')
    }

    const message = await this.builder.buildMessage(this.config.roomId, 'IM', payload)
    this.connection.send(
      StompDestinations.SEND_IM,
      {
        sent: String(Date.now()),
        'content-type': 'application/json',
      },
      JSON.stringify({ ...message, isMessageOut: true }),
    )
  }

  async sendTypingState(state: TypingState): Promise<void> {
    const message = await this.builder.buildEvent(this.config.roomId, 'TYPING', { state })
    this.sendEventMessage(message)
  }

  async sendPresence(presence: string): Promise<void> {
    const message = await this.builder.buildEvent(this.config.roomId, 'PRESENCE', { presence })
    this.sendEventMessage(message)
  }

  async sendDeliveryAck(clientMessageId: string, deliveryState: 'SERVER' | 'CLIENT'): Promise<void> {
    const message = await this.builder.buildEvent(this.config.roomId, 'DELIVERY', {
      clientMessageId,
      deliveryState,
    })
    this.sendEventMessage(message)
  }

  async sendRtcSignal(state: string, rtcObject: unknown): Promise<void> {
    const message = await this.builder.buildEvent(this.config.roomId, 'WRTC', { state, rtcObject })
    this.sendEventMessage(message)
  }

  async sendEvent(type: string, payload: Record<string, unknown>): Promise<void> {
    const message = await this.builder.buildEvent(this.config.roomId, type, payload)
    this.sendEventMessage(message)
  }

  private sendEventMessage(message: { messageType: string; [key: string]: unknown }): void {
    this.connection.send(
      StompDestinations.SEND_EVENT,
      {
        sent: String(Date.now()),
        'content-type': 'application/json',
      },
      JSON.stringify(message),
    )
  }
}
```

- [ ] **Step 7: Run MessageService tests**

```bash
npx vitest run tests/messaging/MessageService.test.ts
```
Expected: all PASS

- [ ] **Step 8: Commit**

```bash
git add src/messaging/ tests/messaging/
git commit -m "feat: add MessageService and MessageBuilder"
```

---

**Design note:** `PresenceService` from the spec is folded into `MessageService` (Task 5), which already handles `sendTypingState()` and `sendPresence()`. A separate `PresenceService` would be pure delegation with no added value. The `presence/` directory is reserved for future state-tracking needs.

---

### Task 6: FileService — File Upload & Download URLs

**Files:**
- Create: `src/files/types.ts`
- Create: `src/files/FileService.ts`
- Create: `tests/files/FileService.test.ts`

**Interfaces:**
- Consumes: `Config` (serverUrl, fileServiceUrl), `Auth` (accessToken)
- Produces: `FileService` — `upload(file: File): Promise<FileInfo>`, `getFileUrl(fileId: string): string`

- [ ] **Step 1: Write FileService tests**

```typescript
// tests/files/FileService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FileService } from '../../src/files/FileService'
import { Config } from '../../src/core/Config'
import { Auth } from '../../src/core/Auth'

const token = btoa(JSON.stringify({ alg: 'HS256' })) + '.' + btoa(JSON.stringify({ user_name: 'u1' })) + '.sig'

describe('FileService', () => {
  let service: FileService

  beforeEach(() => {
    const config = new Config({ serverUrl: 'https://api.example.com', accessToken: token, roomId: 'r1' })
    const auth = new Auth(token)
    service = new FileService(config, auth)
  })

  it('getFileUrl returns correct URL', () => {
    const url = service.getFileUrl('file-123')
    expect(url).toBe('https://api.example.com/fs/file/file-123')
  })

  it('getFileUrl throws on empty fileId', () => {
    expect(() => service.getFileUrl('')).toThrow('fileId is required')
  })

  it('upload sends FormData with auth header', async () => {
    const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' })
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ result: { fileId: 'f1' } }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await service.upload(mockFile)
    expect(result).toEqual({ fileId: 'f1', name: 'test.txt', mimeType: 'text/plain', size: 7 })
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/fs/file',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: `bearer ${token}` },
      })
    )
  })

  it('upload falls back to text/plain for empty mimeType', async () => {
    const mockFile = new File(['x'], 'noext', { type: '' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: { fileId: 'f2' } }),
    }))

    const result = await service.upload(mockFile)
    expect(result.mimeType).toBe('text/plain')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })
})
```

- [ ] **Step 2: Implement FileService**

```typescript
// src/files/types.ts
export interface FileInfo {
  fileId: string
  name: string
  mimeType: string
  size: number
}
```

```typescript
// src/files/FileService.ts
import type { Config } from '../core/Config'
import type { Auth } from '../core/Auth'
import type { FileInfo } from './types'

export class FileService {
  constructor(
    private readonly config: Config,
    private readonly auth: Auth,
  ) {}

  getFileUrl(fileId: string): string {
    if (!fileId) {
      throw new Error('fileId is required')
    }
    return `${this.config.fileServiceUrl}/${fileId}`
  }

  async upload(file: File): Promise<FileInfo> {
    const formData = new FormData()
    formData.append('file', file)

    const mimeType = file.type || 'text/plain'

    const response = await fetch(this.config.fileServiceUrl, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `bearer ${this.auth.accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`File upload failed: ${response.status}`)
    }

    const json = await response.json() as { result: { fileId: string } }
    return {
      fileId: json.result.fileId,
      name: file.name,
      mimeType,
      size: file.size,
    }
  }
}
```

- [ ] **Step 3: Run FileService tests**

```bash
npx vitest run tests/files/FileService.test.ts
```
Expected: all PASS

- [ ] **Step 4: Commit**

```bash
git add src/files/ tests/files/
git commit -m "feat: add FileService — upload and download URL generation"
```

---

### Task 7: Call Layer — MediaManager, PeerConnection, CallService

**Files:**
- Create: `src/calling/types.ts`
- Create: `src/calling/MediaManager.ts`
- Create: `src/calling/PeerConnection.ts`
- Create: `src/calling/CallService.ts`
- Create: `tests/calling/MediaManager.test.ts`
- Create: `tests/calling/PeerConnection.test.ts`
- Create: `tests/calling/CallService.test.ts`

**Interfaces:**
- Consumes: `Config` (rtcConfig, mediaConstraints), `TypedEmitter`, `MessageService` (for sending RTC signals)
- Produces:
  - `MediaManager` — `getUserMedia()`, `getConnectedDevices(type)`, `toggleTrack(kind, enabled)`
  - `PeerConnection` — `create()`, `createOffer()`, `createAnswer()`, `setRemoteDescription(sdp)`, `addIceCandidate(candidate)`, `close()`, connection state
  - `CallService` — `makeCall()`, `endCall(force?)`, `handleSignal(type, payload)`, `toggleMicrophone(enabled)`, `toggleCamera(enabled)`

- [ ] **Step 1: Create calling types**

```typescript
// src/calling/types.ts
export const RtcSignalType = {
  CALL_REQUEST: 'CALL_REQUEST',
  CALL_ACCEPTED: 'CALL_ACCEPTED',
  OFFER: 'OFFER',
  ANSWER: 'ANSWER',
  CANDIDATE: 'CANDIDATE',
  END_CALL: 'END_CALL',
} as const

export type RtcSignalType = (typeof RtcSignalType)[keyof typeof RtcSignalType]
```

- [ ] **Step 2: Write MediaManager tests**

```typescript
// tests/calling/MediaManager.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MediaManager } from '../../src/calling/MediaManager'

describe('MediaManager', () => {
  const constraints = {
    video: { width: { min: 384, ideal: 640 } },
    audio: { echoCancellation: true },
  }

  beforeEach(() => {
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [
            { kind: 'video', stop: vi.fn(), enabled: true },
            { kind: 'audio', stop: vi.fn(), enabled: true },
          ],
        }),
        enumerateDevices: vi.fn().mockResolvedValue([
          { kind: 'videoinput', deviceId: 'v1' },
          { kind: 'audioinput', deviceId: 'a1' },
        ]),
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('getUserMedia returns stream', async () => {
    const stream = await MediaManager.getUserMedia(constraints)
    expect(stream).toBeDefined()
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(constraints)
  })

  it('existsConnectedDevices returns true when devices present', async () => {
    const exists = await MediaManager.existsConnectedDevices('videoinput')
    expect(exists).toBe(true)
  })

  it('existsConnectedDevices returns false when no devices', async () => {
    vi.stubGlobal('navigator', {
      mediaDevices: {
        enumerateDevices: vi.fn().mockResolvedValue([]),
        getUserMedia: vi.fn(),
      },
    })
    const exists = await MediaManager.existsConnectedDevices('videoinput')
    expect(exists).toBe(false)
  })

  it('toggleTrack enables/disables track by kind', () => {
    const stream = { getTracks: () => [{ kind: 'video', enabled: true }] } as MediaStream
    MediaManager.toggleTrack(stream, 'video', false)
    expect(stream.getTracks()[0]!.enabled).toBe(false)
  })
})
```

- [ ] **Step 3: Implement MediaManager**

```typescript
// src/calling/MediaManager.ts
export class MediaManager {
  static async getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia(constraints)
  }

  static async getConnectedDevices(type: MediaDeviceKind): Promise<MediaDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter(d => d.kind === type)
  }

  static async existsConnectedDevices(type: MediaDeviceKind): Promise<boolean> {
    const devices = await MediaManager.getConnectedDevices(type)
    return devices.length > 0
  }

  static async getAvailableConstraints(
    requested: MediaStreamConstraints,
  ): Promise<MediaStreamConstraints> {
    const constraints = { ...requested }

    if (constraints.video && constraints.video !== false) {
      const hasVideo = await MediaManager.existsConnectedDevices('videoinput')
      if (!hasVideo) constraints.video = false
    }

    if (constraints.audio && constraints.audio !== false) {
      const hasAudio = await MediaManager.existsConnectedDevices('audioinput')
      if (!hasAudio) constraints.audio = false
    }

    return constraints
  }

  static toggleTrack(stream: MediaStream, kind: string, enabled: boolean): void {
    stream.getTracks().forEach(track => {
      if (track.kind === kind) {
        track.enabled = enabled
      }
    })
  }

  static stopAllTracks(stream: MediaStream | null): void {
    if (!stream) return
    stream.getTracks().forEach(track => track.stop())
  }
}
```

- [ ] **Step 4: Run MediaManager tests**

```bash
npx vitest run tests/calling/MediaManager.test.ts
```
Expected: all PASS

- [ ] **Step 5: Implement PeerConnection**

```typescript
// src/calling/PeerConnection.ts
import type { RtcConfig } from '../core/Config'
import { RtcSignalType } from './types'
import type { RtcSignalType as RtcSignal } from './types'

export type RtcSignalCallback = (type: RtcSignal, payload: unknown) => void

export class PeerConnection {
  private pc: RTCPeerConnection | null = null
  private onSignal: RtcSignalCallback

  constructor(
    private readonly rtcConfig: Required<RtcConfig>,
    onSignal: RtcSignalCallback,
  ) {
    this.onSignal = onSignal
  }

  get connection(): RTCPeerConnection | null {
    return this.pc
  }

  create(stream: MediaStream): void {
    if (this.pc) {
      this.close()
    }

    this.pc = new RTCPeerConnection(this.rtcConfig)

    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.onSignal(RtcSignalType.CANDIDATE, candidate)
      }
    }

    this.pc.ontrack = ({ streams }) => {
      const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement | null
      if (remoteVideo) {
        remoteVideo.srcObject = streams[0]!
      }
    }

    stream.getTracks().forEach(track => {
      this.pc!.addTrack(track, stream)
    })
  }

  async createOffer(): Promise<void> {
    if (!this.pc) throw new Error('PeerConnection not created')
    const offer = await this.pc.createOffer({
      iceRestart: true,
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    })
    await this.pc.setLocalDescription(offer)
    this.onSignal(RtcSignalType.OFFER, offer)
  }

  async createAnswer(): Promise<void> {
    if (!this.pc) throw new Error('PeerConnection not created')
    const answer = await this.pc.createAnswer()
    await this.pc.setLocalDescription(answer)
    this.onSignal(RtcSignalType.ANSWER, answer)
  }

  async setRemoteDescription(sdp: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) throw new Error('PeerConnection not created')
    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp))
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc || !this.pc.currentRemoteDescription) return
    await this.pc.addIceCandidate(new RTCIceCandidate(candidate))
  }

  getState(): string {
    return this.pc?.connectionState ?? 'closed'
  }

  close(): void {
    if (!this.pc) return
    this.pc.getTransceivers().forEach(t => t.stop())
    this.pc.onicecandidate = null
    this.pc.ontrack = null
    this.pc.close()
    this.pc = null
  }
}
```

- [ ] **Step 6: Implement CallService**

```typescript
// src/calling/CallService.ts
import type { Config } from '../core/Config'
import type { TypedEmitter } from '../core/TypedEmitter'
import type { MessageService } from '../messaging/MessageService'
import type { MessagingEventMap, CallStateEvent } from '../events/types'
import { EventType } from '../events/EventType'
import { CallState } from '../enums/CallState'
import { RtcSignalType } from './types'
import type { RtcSignalType as RtcSignal } from './types'
import { PeerConnection } from './PeerConnection'
import { MediaManager } from './MediaManager'

export class CallService {
  private peerConnection: PeerConnection
  private localStream: MediaStream | null = null
  private isCaller = false
  private autoReconnectCount = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private readonly config: Config,
    private readonly events: TypedEmitter<MessagingEventMap>,
    private readonly messageService: MessageService,
  ) {
    this.peerConnection = new PeerConnection(config.rtcConfig, (type, payload) => {
      this.messageService.sendRtcSignal(type, payload)
    })
  }

  get isInCall(): boolean {
    return this.peerConnection.connection !== null
  }

  async makeCall(): Promise<void> {
    if (this.isCaller && this.peerConnection.connection) return

    this.isCaller = true
    const stream = await this.acquireMedia()
    this.localStream = stream

    this.peerConnection.create(stream)
    this.emitState(CallState.CONNECTING)
    await this.messageService.sendRtcSignal(RtcSignalType.CALL_REQUEST, {})
  }

  async endCall(forceCloseSession = false): Promise<void> {
    this.clearReconnectTimer()
    this.peerConnection.close()
    MediaManager.stopAllTracks(this.localStream)
    this.localStream = null
    this.isCaller = false
    this.autoReconnectCount = 0

    await this.messageService.sendRtcSignal(RtcSignalType.END_CALL, { forceCloseSession })
    this.emitState(forceCloseSession ? CallState.END_CALL : CallState.DISCONNECTED)
  }

  async handleSignal(type: string, payload: unknown): Promise<void> {
    switch (type) {
      case RtcSignalType.CALL_REQUEST:
        this.isCaller = false
        await this.handleIncomingCall()
        break
      case RtcSignalType.CALL_ACCEPTED:
        await this.peerConnection.createOffer()
        this.scheduleReconnect()
        break
      case RtcSignalType.OFFER:
        await this.peerConnection.setRemoteDescription(payload as RTCSessionDescriptionInit)
        await this.peerConnection.createAnswer()
        break
      case RtcSignalType.ANSWER:
        await this.peerConnection.setRemoteDescription(payload as RTCSessionDescriptionInit)
        break
      case RtcSignalType.CANDIDATE:
        await this.peerConnection.addIceCandidate(payload as RTCIceCandidateInit)
        break
      case RtcSignalType.END_CALL:
        this.peerConnection.close()
        MediaManager.stopAllTracks(this.localStream)
        this.localStream = null
        this.emitState(CallState.END_CALL)
        break
    }
  }

  toggleMicrophone(enabled: boolean): void {
    if (this.localStream) {
      MediaManager.toggleTrack(this.localStream, 'audio', enabled)
    }
  }

  toggleCamera(enabled: boolean): void {
    if (this.localStream) {
      MediaManager.toggleTrack(this.localStream, 'video', enabled)
    }
  }

  private async handleIncomingCall(): Promise<void> {
    const stream = await this.acquireMedia()
    this.localStream = stream
    this.peerConnection.create(stream)
    this.emitState(CallState.CONNECTING)
    await this.messageService.sendRtcSignal(RtcSignalType.CALL_ACCEPTED, {})
  }

  private async acquireMedia(): Promise<MediaStream> {
    const constraints = await MediaManager.getAvailableConstraints(
      this.config.mediaConstraints as MediaStreamConstraints
    )
    return MediaManager.getUserMedia(constraints)
  }

  private scheduleReconnect(): void {
    this.reconnectTimer = setTimeout(() => {
      if (this.peerConnection.getState() !== 'connected' && this.autoReconnectCount < 2) {
        this.autoReconnectCount++
        this.messageService.sendRtcSignal(RtcSignalType.END_CALL, {})
          .then(() => this.makeCall())
      }
    }, 3000)
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private emitState(state: string): void {
    this.events.emit(EventType.CallChange, {
      state: state as CallStateEvent['state'],
    })
  }
}
```

- [ ] **Step 7: Write CallService tests**

```typescript
// tests/calling/CallService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@stomp/stompjs', () => ({
  Client: vi.fn(() => ({
    activate: vi.fn(), deactivate: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    publish: vi.fn(), onConnect: undefined, onDisconnect: undefined,
    onStompError: undefined, onWebSocketClose: undefined, connected: false,
  })),
}))

import { CallService } from '../../src/calling/CallService'
import { Config, type MessagingOptions } from '../../src/core/Config'
import { Auth } from '../../src/core/Auth'
import { TypedEmitter } from '../../src/core/TypedEmitter'
import { StompConnection } from '../../src/connection/StompConnection'
import { MessageService } from '../../src/messaging/MessageService'
import type { MessagingEventMap } from '../../src/events/types'
import { EventType } from '../../src/events/EventType'

const token = btoa(JSON.stringify({ alg: 'HS256' })) + '.' + btoa(JSON.stringify({ user_name: 'u1' })) + '.sig'
const options: MessagingOptions = { serverUrl: 'https://x.com', accessToken: token, roomId: 'r1' }

describe('CallService', () => {
  let service: CallService
  let events: TypedEmitter<MessagingEventMap>
  let messageService: MessageService

  beforeEach(() => {
    vi.clearAllMocks()
    const config = new Config(options)
    const auth = new Auth(token)
    events = new TypedEmitter<MessagingEventMap>()
    const connection = new StompConnection(config, auth, events)
    messageService = new MessageService(connection, config, auth)
    service = new CallService(config, events, messageService)
  })

  it('starts not in a call', () => {
    expect(service.isInCall).toBe(false)
  })

  it('toggleMicrophone and toggleCamera do not throw when no call', () => {
    expect(() => service.toggleMicrophone(false)).not.toThrow()
    expect(() => service.toggleCamera(true)).not.toThrow()
  })

  it('emit CallChange on endCall', async () => {
    const handler = vi.fn()
    events.on(EventType.CallChange, handler)
    await service.endCall()
    expect(handler).toHaveBeenCalled()
  })
})
```

- [ ] **Step 8: Run CallService tests**

```bash
npx vitest run tests/calling/
```
Expected: all PASS

- [ ] **Step 9: Commit**

```bash
git add src/calling/ tests/calling/
git commit -m "feat: add call layer — MediaManager, PeerConnection, CallService"
```

---

### Task 8: MessagingClient — Main Façade

**Files:**
- Create: `src/MessagingClient.ts`
- Create: `src/RoomInfoService.ts`
- Create: `tests/MessagingClient.test.ts`

**Interfaces:**
- Consumes: All services (Config, Auth, StompConnection, MessageService, CallService, FileService, TypedEmitter)
- Produces: `MessagingClient` — the single public API class
- Note: `RoomInfoService` handles `getRoomInfo()` (legacy name: calls XHR GET `/room/roomInfo/{roomCode}`, returns room info and re-initializes auth)

- [ ] **Step 1: Implement RoomInfoService**

```typescript
// src/RoomInfoService.ts
import type { Config } from './core/Config'
import type { Auth } from './core/Auth'

export interface RoomInfo {
  currentParticipant: { token: string }
  [key: string]: unknown
}

export class RoomInfoService {
  async getRoomInfo(roomCode: string, config: Config): Promise<RoomInfo> {
    const response = await fetch(`${config.serverUrl}/room/roomInfo/${roomCode}`)
    const json = await response.json() as { result?: RoomInfo; payload?: RoomInfo; messages?: Array<{ code: string }> }

    if (json.result) return json.result
    if (json.messages && json.messages.length > 0 && json.messages[0]!.code === 'NO_LINK_FOUND') {
      throw new Error('INVALID_ROOM_CODE')
    }
    return json.payload as RoomInfo
  }
}
```

- [ ] **Step 2: Write MessagingClient tests**

```typescript
// tests/MessagingClient.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@stomp/stompjs', () => ({
  Client: vi.fn(() => ({
    activate: vi.fn(), deactivate: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    publish: vi.fn(), onConnect: undefined, onDisconnect: undefined,
    onStompError: undefined, onWebSocketClose: undefined, connected: false,
  })),
}))

import { MessagingClient } from '../src/MessagingClient'
import { EventType } from '../src/events/EventType'

const token = btoa(JSON.stringify({ alg: 'HS256' })) + '.' + btoa(JSON.stringify({ user_name: 'u1' })) + '.sig'

describe('MessagingClient', () => {
  let client: MessagingClient

  beforeEach(() => {
    client = new MessagingClient({
      serverUrl: 'https://api.example.com',
      accessToken: token,
      roomId: 'room-1',
    })
  })

  it('exposes EventType statically', () => {
    expect(MessagingClient.EventType.Message).toBe('message')
  })

  it('registers and receives events', () => {
    const handler = vi.fn()
    client.on(EventType.ConnectionChange, handler)
    // Simulate service emitting an event
    client['events'].emit(EventType.ConnectionChange, {
      state: 'CONNECTED' as any,
      connected: true,
    })
    expect(handler).toHaveBeenCalledWith({ state: 'CONNECTED', connected: true })
  })

  it('removes event handlers via off()', () => {
    const handler = vi.fn()
    client.on(EventType.ConnectionChange, handler)
    client.off(EventType.ConnectionChange, handler)
    client['events'].emit(EventType.ConnectionChange, {
      state: 'CONNECTED' as any,
      connected: true,
    })
    expect(handler).not.toHaveBeenCalled()
  })

  it('connect() delegates to StompConnection', () => {
    const connectSpy = vi.spyOn(client['connection'], 'connect')
    client.connect()
    expect(connectSpy).toHaveBeenCalled()
  })

  it('disconnect() ends call and disconnects', async () => {
    const endCallSpy = vi.spyOn(client['callService'], 'endCall')
    const disconnectSpy = vi.spyOn(client['connection'], 'disconnect')
    await client.disconnect()
    expect(endCallSpy).toHaveBeenCalledWith(false)
    expect(disconnectSpy).toHaveBeenCalled()
  })

  it('sendMessage delegates to MessageService', async () => {
    const spy = vi.spyOn(client['messageService'], 'sendMessage')
    await client.sendMessage('hello')
    expect(spy).toHaveBeenCalledWith('hello', undefined)
  })

  it('makeCall delegates to CallService', async () => {
    const spy = vi.spyOn(client['callService'], 'makeCall').mockResolvedValue(undefined)
    await client.makeCall()
    expect(spy).toHaveBeenCalled()
  })

  it('getFileUrl delegates to FileService', () => {
    const url = client.getFileUrl('file-1')
    expect(url).toBe('https://api.example.com/fs/file/file-1')
  })
})
```

- [ ] **Step 3: Implement MessagingClient**

```typescript
// src/MessagingClient.ts
import { Config, type MessagingOptions } from './core/Config'
import { Auth } from './core/Auth'
import { TypedEmitter } from './core/TypedEmitter'
import { StompConnection } from './connection/StompConnection'
import { MessageService } from './messaging/MessageService'
import { CallService } from './calling/CallService'
import { FileService } from './files/FileService'
import { EventType } from './events/EventType'
import { RoomInfoService } from './RoomInfoService'
import type { MessagingEventMap, ReceivedMessage, ConnectionStateEvent } from './events/types'
import type { TypingState } from './enums/TypingState'
import type { PresenceState } from './enums/PresenceState'

export class MessagingClient {
  static readonly EventType = EventType

  private readonly config: Config
  private readonly auth: Auth
  private readonly events: TypedEmitter<MessagingEventMap>
  private readonly connection: StompConnection
  private readonly messageService: MessageService
  private readonly callService: CallService
  private readonly fileService: FileService
  private readonly roomInfoService: RoomInfoService

  constructor(options: MessagingOptions) {
    this.config = new Config(options)
    this.auth = new Auth(options.accessToken)
    this.events = new TypedEmitter<MessagingEventMap>()

    this.connection = new StompConnection(this.config, this.auth, this.events)
    this.messageService = new MessageService(this.connection, this.config, this.auth)
    this.fileService = new FileService(this.config, this.auth)
    this.callService = new CallService(this.config, this.events, this.messageService)
    this.roomInfoService = new RoomInfoService()
  }

  // ── Events ──

  on<K extends keyof MessagingEventMap>(event: K, handler: MessagingEventMap[K]): void {
    this.events.on(event, handler)
  }

  off<K extends keyof MessagingEventMap>(event: K, handler: MessagingEventMap[K]): void {
    this.events.off(event, handler)
  }

  // ── Connection ──

  connect(): void {
    this.connection.connect()
  }

  async disconnect(): Promise<void> {
    await this.callService.endCall(false)
    await this.connection.disconnect()
  }

  // ── Messaging ──

  async sendMessage(text: string, file?: File): Promise<void> {
    await this.messageService.sendMessage(text, file)
  }

  async getRoomMessages(): Promise<ReceivedMessage[]> {
    const response = await fetch(`${this.config.serverUrl}/room/messages/${this.config.roomId}`, {
      headers: { Authorization: `bearer ${this.auth.accessToken}` },
    })
    if (!response.ok) throw new Error(`Failed to fetch room messages: ${response.status}`)
    const json = await response.json() as { payload?: ReceivedMessage[] }
    return json.payload ?? []
  }

  async getParticipantsState(): Promise<unknown[]> {
    const response = await fetch(
      `${this.config.serverUrl}/room/participantStates/${this.config.roomId}`,
      { headers: { Authorization: `bearer ${this.auth.accessToken}` } },
    )
    if (!response.ok) throw new Error(`Failed to fetch participant states: ${response.status}`)
    const json = await response.json() as { payload?: unknown[] }
    return json.payload ?? []
  }

  async getRoomInfo(roomCode: string): Promise<unknown> {
    return this.roomInfoService.getRoomInfo(roomCode, this.config)
  }

  // ── Presence & Typing ──

  async sendTypingState(state: TypingState): Promise<void> {
    await this.messageService.sendTypingState(state)
  }

  async sendPresence(presence: PresenceState): Promise<void> {
    await this.messageService.sendPresence(presence)
  }

  // ── Calling ──

  async makeCall(): Promise<void> {
    await this.callService.makeCall()
  }

  async endCall(forceCloseSession = false): Promise<void> {
    await this.callService.endCall(forceCloseSession)
  }

  toggleMicrophone(enabled: boolean): void {
    this.callService.toggleMicrophone(enabled)
  }

  toggleCamera(enabled: boolean): void {
    this.callService.toggleCamera(enabled)
  }

  // ── Files ──

  getFileUrl(fileId: string): string {
    return this.fileService.getFileUrl(fileId)
  }
}
```

- [ ] **Step 4: Run MessagingClient tests**

```bash
npx vitest run tests/MessagingClient.test.ts
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/MessagingClient.ts src/RoomInfoService.ts tests/MessagingClient.test.ts
git commit -m "feat: add MessagingClient façade — composes all services"
```

---

### Task 9: Public Exports & Build Verification

**Files:**
- Create: `src/index.ts`

**Interfaces:**
- Produces: Clean public barrel exports
- Consumes: `MessagingClient`, all type exports

- [ ] **Step 1: Create public barrel exports**

```typescript
// src/index.ts
export { MessagingClient } from './MessagingClient'
export { EventType } from './events/EventType'

// Types for consumers
export type { MessagingOptions, RtcConfig, RtcIceServer, MediaConstraints } from './core/Config'
export type {
  ReceivedMessage,
  MediaAttachment,
  ConnectionStateEvent,
  CallStateEvent,
  MessageDeliveryEvent,
  TypingEvent,
  PresenceEvent,
  MessagingError,
  MessagingEventMap,
} from './events/types'
export type { ConnectionState } from './enums/ConnectionState'
export type { CallState } from './enums/CallState'
export type { PresenceState } from './enums/PresenceState'
export type { TypingState } from './enums/TypingState'
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```
Expected: all tests PASS

- [ ] **Step 4: Run build**

```bash
npm run build
```
Expected: `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts` created

- [ ] **Step 5: Verify build output**

```bash
ls -la dist/
node -e "import('./dist/index.js').then(m => console.log(Object.keys(m)))"
```
Expected: Shows exported symbols: `MessagingClient`, `EventType`

- [ ] **Step 6: Commit**

```bash
git add src/index.ts
git commit -m "feat: add public barrel exports"
```

---

### Task 10: Remove Old Code & Final Cleanup

**Files:**
- Delete: `src/*.js` (all old JS files)
- Delete: `src/lib/` (directory)
- Delete: `src/model/` (directory)
- Delete: `src/spec/` (directory)
- Delete: `src/i18n/` (directory)
- Delete: `dist/` (old build output)
- Update: `README.md` (update API docs)

- [ ] **Step 1: Remove old source files**

```bash
# Remove old JS sources
rm -f src/ApplicationConfig.js src/CommunicationClient.js src/StompClient.js src/MessageChanel.js src/index.js
# Remove old directories
rm -rf src/lib/ src/model/ src/spec/ src/i18n/
# Remove old build output
rm -rf dist/
```

- [ ] **Step 2: Run tests one final time**

```bash
npx vitest run
```
Expected: all PASS

- [ ] **Step 3: Run build**

```bash
npm run build
```
Expected: clean build, no errors

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old JS source files and build artifacts"
```

---

## Implementation Order Summary

```
Task 1  → Project setup (npm install works, configs in place)
Task 2  → Core layer (TypedEmitter, Config, Auth, HttpClient)
Task 3  → Shared enums & types
Task 4  → StompConnection (depends on 1,2,3)
Task 5  → MessageService + MessageBuilder (depends on 4)
Task 6  → FileService (depends on 2)
Task 7  → CallService + MediaManager + PeerConnection (depends on 2,3,5)
Task 8  → MessagingClient façade (depends on all)
Task 9  → Public exports + build verification
Task 10 → Remove old code, final cleanup
```
