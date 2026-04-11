# StreamFenceJs — Plan 2: Delivery Engine & Prom Metrics Design

**Date:** 2026-04-11
**Status:** Approved
**Builds on:** Plan 1 (Foundation) — public type system complete, all tests green

---

## 1. Scope

### In scope

| Area | Files |
|---|---|
| Config bridge | `src/internal/config/TopicPolicy.ts` |
| Transport boundary | `src/internal/transport/TransportClient.ts` |
| Observability | `src/internal/observability/ServerEventPublisher.ts` |
| Delivery engine | `src/internal/delivery/` — 13 files (see §3) |
| Public metrics impl | `src/PromServerMetrics.ts` |
| Dependency | `prom-client` added to `dependencies` |
| Tests | `test/unit/` mirroring all new source files |

### Out of scope (deferred)

- Socket.IO wiring — Plan 3
- `StreamFenceServer` assembly — Plan 3
- YAML/JSON config loader — Plan 4
- `StreamFenceServerSpec` — Plan 4

---

## 2. Module Layout

```
src/
├── PromServerMetrics.ts                         # NEW — public export
├── index.ts                                     # updated: export PromServerMetrics
└── internal/
    ├── config/
    │   └── TopicPolicy.ts                       # NEW
    ├── transport/
    │   └── TransportClient.ts                   # NEW
    ├── observability/
    │   └── ServerEventPublisher.ts              # NEW
    └── delivery/
        ├── PublishedMessage.ts                  # NEW
        ├── LaneEntry.ts                         # NEW
        ├── EnqueueStatus.ts                     # NEW
        ├── EnqueueResult.ts                     # NEW
        ├── RetryAction.ts                       # NEW
        ├── RetryDecision.ts                     # NEW
        ├── ClientLane.ts                        # NEW
        ├── TopicRegistry.ts                     # NEW
        ├── ClientSessionState.ts                # NEW
        ├── ClientSessionRegistry.ts             # NEW
        ├── AckTracker.ts                        # NEW
        ├── RetryService.ts                      # NEW
        └── TopicDispatcher.ts                   # NEW

test/unit/
├── PromServerMetrics.test.ts
└── internal/
    ├── config/
    │   └── TopicPolicy.test.ts
    ├── observability/
    │   └── ServerEventPublisher.test.ts
    └── delivery/
        ├── ClientLane.test.ts
        ├── AckTracker.test.ts
        ├── RetryService.test.ts
        ├── ClientSessionState.test.ts
        ├── ClientSessionRegistry.test.ts
        ├── TopicRegistry.test.ts
        └── TopicDispatcher.test.ts
```

---

## 3. Component Designs

### 3.1 `TopicPolicy` (`internal/config/TopicPolicy.ts`)

A frozen record that captures all per-topic delivery configuration, derived from a `NamespaceSpec`. One `TopicPolicy` is created per topic in the namespace (all topics share the same spec values).

```typescript
export interface TopicPolicy {
  readonly namespace: string;
  readonly topic: string;
  readonly deliveryMode: DeliveryModeValue;
  readonly overflowAction: OverflowActionValue;
  readonly maxQueuedMessagesPerClient: number;
  readonly maxQueuedBytesPerClient: number;
  readonly ackTimeoutMs: number;
  readonly maxRetries: number;
  readonly coalesce: boolean;
  readonly allowPolling: boolean;
  readonly maxInFlight: number;
}

export function topicPoliciesFromNamespaceSpec(spec: NamespaceSpec): TopicPolicy[]
```

`topicPoliciesFromNamespaceSpec` maps each topic in `spec.topics` to a frozen `TopicPolicy` record. The factory is the only way to create a `TopicPolicy` — no public constructor.

---

### 3.2 `TransportClient` (`internal/transport/TransportClient.ts`)

Minimal interface representing a connected client from the delivery engine's perspective. Plan 3 wires a Socket.IO socket to this. Tests inject a `FakeTransportClient`.

```typescript
export interface TransportClient {
  readonly clientId: string;
  sendEvent(eventName: string, args: readonly unknown[]): void;
}
```

---

### 3.3 `ServerEventPublisher` (`internal/observability/ServerEventPublisher.ts`)

Wraps an optional `ServerEventListener`. All methods swallow errors thrown by user callbacks — a bad listener must never crash the delivery engine.

```typescript
export class ServerEventPublisher {
  static noOp(): ServerEventPublisher
  constructor(listener?: ServerEventListener)

  queueOverflow(namespace: string, clientId: string, topic: string, reason: string): void
  retry(namespace: string, clientId: string, topic: string, messageId: string, retryCount: number): void
  retryExhausted(namespace: string, clientId: string, topic: string, messageId: string, retryCount: number): void
  publishAccepted(namespace: string, clientId: string, topic: string, messageId: string): void
  publishRejected(namespace: string, clientId: string, topic: string, reason: string): void
  clientConnected(namespace: string, clientId: string): void
  clientDisconnected(namespace: string, clientId: string): void
  subscribed(namespace: string, clientId: string, topic: string): void
  unsubscribed(namespace: string, clientId: string, topic: string): void
}
```

Each method builds the appropriate event record (from Plan 1 types) and calls the corresponding optional `ServerEventListener` callback inside `try/catch`.

---

### 3.4 Delivery Records (`internal/delivery/`)

**`EnqueueStatus`** — string-literal const enum (same pattern as Plan 1 enums):
```
ACCEPTED | COALESCED | DROPPED_OLDEST_AND_ACCEPTED | REPLACED_SNAPSHOT | REJECTED
```

**`EnqueueResult`** — frozen record `{ status: EnqueueStatusValue, reason: string }`.

**`RetryAction`** — `RETRY | EXHAUSTED`.

**`RetryDecision`** — frozen record `{ action, clientId, namespace, topic, pendingMessage: LaneEntry }`.

**`PublishedMessage`** — frozen record `{ outboundMessage: OutboundTopicMessage, coalesceKey: string | null }`.

**`LaneEntry`** — mutable (intentionally): holds `PublishedMessage` plus `retryCount: number` (incremented on retry), `awaiting: boolean` (in-flight for AT_LEAST_ONCE). Exposes `messageId`, `topic`, `estimatedBytes`, `ackRequired`, `outboundMessage` as computed getters delegating to the inner `PublishedMessage`.

---

### 3.5 `ClientLane` (`internal/delivery/ClientLane.ts`)

Per-client, per-topic FIFO queue. Holds a `TopicPolicy` reference for limit and overflow configuration.

**State:**
- `queue: LaneEntry[]` — ordered oldest-first
- `queuedBytes: number` — running total
- `inFlightCount: number` — entries currently `awaiting === true`

**Key methods:**
```typescript
enqueue(entry: LaneEntry): EnqueueResult
poll(): LaneEntry | undefined                    // remove & return head
peek(): LaneEntry | undefined                    // head without removal
firstPendingSend(): LaneEntry | undefined        // first non-awaiting entry
hasPendingSend(): boolean
markAwaiting(entry: LaneEntry): void             // sets awaiting=true, increments inFlightCount
removeByMessageId(id: string): LaneEntry | undefined
findByMessageId(id: string): LaneEntry | undefined
get topicPolicy(): TopicPolicy
get inFlightCount(): number
```

**Overflow logic in `enqueue`** (mirrors Java exactly):
1. Reject immediately if `estimatedBytes > maxQueuedBytesPerClient`.
2. `SNAPSHOT_ONLY` → `replaceSnapshot(entry)`.
3. If `coalesce || overflowAction === COALESCE` → attempt `tryCoalesce(entry)`.
4. If fits → accept.
5. Switch on `overflowAction`: `DROP_OLDEST` → drop head(s) until fits; `REJECT_NEW` → reject; `COALESCE` → reject (no match); `SNAPSHOT_ONLY` → `replaceSnapshot`; `SPILL_TO_DISK` → reject with "not supported".

---

### 3.6 `TopicRegistry` (`internal/delivery/TopicRegistry.ts`)

Lookup table: `(namespace, topic)` → `TopicPolicy`.

```typescript
export class TopicRegistry {
  register(policy: TopicPolicy): void
  registerAll(policies: TopicPolicy[]): void
  find(namespace: string, topic: string): TopicPolicy | undefined
  has(namespace: string, topic: string): boolean
}
```

Key: `${namespace}::${topic}`. Populated at server start-up by calling `topicPoliciesFromNamespaceSpec` for each registered `NamespaceSpec`.

---

### 3.7 `ClientSessionState` (`internal/delivery/ClientSessionState.ts`)

All state for one connected client.

```typescript
export class ClientSessionState {
  constructor(clientId: string, namespace: string, client: TransportClient)

  readonly clientId: string
  readonly namespace: string
  readonly client: TransportClient

  // Subscription management
  subscribe(topic: string): void
  unsubscribe(topic: string): void
  isSubscribed(topic: string): boolean
  subscribedTopics(): readonly string[]

  // Lane access — creates lane lazily on first access
  lane(topic: string, policy?: TopicPolicy): ClientLane | undefined

  // Drain guards
  startDrain(topic: string): boolean    // returns false if already draining
  finishDrain(topic: string): void
  isDraining(topic: string): boolean
}
```

Lanes are stored in a `Map<string, ClientLane>`. A lane is created on first `lane(topic, policy)` call with a policy. Subsequent calls without policy return the existing lane or `undefined`.

---

### 3.8 `ClientSessionRegistry` (`internal/delivery/ClientSessionRegistry.ts`)

```typescript
export class ClientSessionRegistry {
  register(state: ClientSessionState): void
  remove(clientId: string): void
  get(clientId: string): ClientSessionState | undefined
  subscribersOf(namespace: string, topic: string): ClientSessionState[]
  subscribe(state: ClientSessionState, topic: string): void
  unsubscribe(state: ClientSessionState, topic: string): void
}
```

Internally maintains: `sessions: Map<string, ClientSessionState>` plus a `subscriptions: Map<string, Set<string>>` keyed by `${namespace}::${topic}` for efficient `subscribersOf` lookups.

---

### 3.9 `AckTracker` (`internal/delivery/AckTracker.ts`)

Tracks in-flight AT_LEAST_ONCE messages awaiting acknowledgment.

**State:**
- `pending: Map<string, PendingAckState>` — key: `${clientId}::${namespace}::${topic}::${messageId}`
- `heap: ExpirationHandle[]` — min-heap sorted by `deadline` (ms)

```typescript
export class AckTracker {
  register(
    clientId: string, namespace: string, topic: string,
    entry: LaneEntry, ackTimeoutMs: number, maxRetries: number,
    now?: number   // defaults to Date.now(), injectable for tests
  ): void

  acknowledge(clientId: string, namespace: string, topic: string, messageId: string): boolean

  collectExpired(now?: number): RetryDecision[]   // now defaults to Date.now()

  removeClient(clientId: string): void
  removeClientTopic(clientId: string, namespace: string, topic: string): void

  get pendingCount(): number
}
```

`collectExpired` walks the heap head while `deadline <= now`. Uses a **generation counter** per pending entry to discard stale heap handles after re-registration (mirrors Java's approach). Returns a `RetryDecision[]` — either `RETRY` (increments `retryCount` on the entry, re-queues handle with new deadline) or `EXHAUSTED` (removes from `pending`).

---

### 3.10 `RetryService` (`internal/delivery/RetryService.ts`)

Thin wrapper that owns the retry ticker.

```typescript
export class RetryService {
  constructor(ackTracker: AckTracker, intervalMs?: number)  // default 50ms

  start(): void    // starts setInterval
  stop(): void     // clears setInterval
  scan(now?: number): RetryDecision[]   // manual trigger (also called internally)
}
```

`start()` sets up `setInterval(() => this.scan(Date.now()), intervalMs)`. Tests call `scan()` directly without starting the interval.

---

### 3.11 `TopicDispatcher` (`internal/delivery/TopicDispatcher.ts`)

Central orchestrator. Dependencies injected via constructor.

```typescript
export class TopicDispatcher {
  constructor(options: {
    topicRegistry: TopicRegistry;
    sessionRegistry: ClientSessionRegistry;
    ackTracker: AckTracker;
    retryService: RetryService;
    metrics: ServerMetrics;
    eventPublisher?: ServerEventPublisher;   // defaults to noOp
  })

  publish(namespace: string, topic: string, payload: unknown): void
  publishTo(namespace: string, clientId: string, topic: string, payload: unknown): void

  acknowledge(clientId: string, namespace: string, topic: string, messageId: string): void
  processRetries(): void    // called by RetryService.scan() result handler

  onClientDisconnected(clientId: string): void
  onClientUnsubscribed(clientId: string, namespace: string, topic: string): void

  close(): void   // stops RetryService ticker
}
```

**Drain scheduling:** `scheduleDrain(session, topic)` checks `session.startDrain(topic)` — if already draining, returns. Otherwise calls `queueMicrotask(() => this.drainTopic(session, topic))`.

**`drainTopic`** runs in a `try/finally` that always calls `session.finishDrain(topic)` and re-schedules if `lane.hasPendingSend()` after finishing.

**Lifecycle:** `TopicDispatcher` calls `retryService.start()` in its constructor and `retryService.stop()` in `close()`. The retry ticker is therefore active for the full lifetime of the dispatcher.

**Byte estimation:** `Buffer.byteLength(JSON.stringify(payload), 'utf8')`. Falls back to `1` if JSON serialisation throws.

---

### 3.12 `PromServerMetrics` (`src/PromServerMetrics.ts`)

Public class implementing `ServerMetrics`. Owns its own `prom-client` `Registry` (not the default global singleton) so multiple instances are isolated and tests don't leak state.

**Metric types:**

| Method | Metric name | Type | Labels |
|---|---|---|---|
| `recordConnect` | `streamfence_connections_total` | Counter | `namespace` |
| `recordDisconnect` | `streamfence_disconnections_total` | Counter | `namespace` |
| `recordPublish` | `streamfence_messages_published_total` | Counter | `namespace`, `topic` |
| `recordPublish` (bytes) | `streamfence_messages_published_bytes_total` | Counter | `namespace`, `topic` |
| `recordReceived` | `streamfence_messages_received_total` | Counter | `namespace`, `topic` |
| `recordReceived` (bytes) | `streamfence_messages_received_bytes_total` | Counter | `namespace`, `topic` |
| `recordQueueOverflow` | `streamfence_queue_overflow_total` | Counter | `namespace`, `topic`, `reason` |
| `recordRetry` | `streamfence_retries_total` | Counter | `namespace`, `topic` |
| `recordRetryExhausted` | `streamfence_retries_exhausted_total` | Counter | `namespace`, `topic` |
| `recordDropped` | `streamfence_messages_dropped_total` | Counter | `namespace`, `topic` |
| `recordCoalesced` | `streamfence_messages_coalesced_total` | Counter | `namespace`, `topic` |
| `recordAuthRejected` | `streamfence_auth_rejected_total` | Counter | `namespace` |
| `recordAuthRateLimited` | `streamfence_auth_rate_limited_total` | Counter | `namespace` |

`scrape()` calls `prom-client`'s `registry.metricsSync()` (synchronous — no async needed).

`PromServerMetrics` is added to `src/index.ts` public exports.

---

## 4. Data Flow

### Publish path
```
TopicDispatcher.publish(ns, topic, payload)
  → TopicRegistry.find(ns, topic) → TopicPolicy  [throws if not found]
  → build OutboundTopicMessage (byte estimate via Buffer.byteLength(JSON.stringify))
  → PublishedMessage { outboundMessage, coalesceKey }
  → for each subscriber in ClientSessionRegistry.subscribersOf(ns, topic):
       ClientLane.enqueue(LaneEntry)
         ACCEPTED | REPLACED_SNAPSHOT | COALESCED | DROPPED_OLDEST_AND_ACCEPTED
           → scheduleDrain(session, topic)
         REJECTED
           → metrics.recordQueueOverflow
           → eventPublisher.queueOverflow
  → metrics.recordPublish(ns, topic, bytes)
```

### Drain path (async, one per session×topic at a time)
```
drainTopic(session, topic)
  BEST_EFFORT:
    lane.poll() → session.client.sendEvent(eventName, args)
    repeat until !hasPendingSend
  AT_LEAST_ONCE (while inFlightCount < maxInFlight):
    lane.firstPendingSend()
    → lane.markAwaiting(entry)
    → AckTracker.register(...)
    → session.client.sendEvent(...)
    → loop
```

### Ack/retry path
```
RetryService ticker (setInterval, default 50ms)
  → AckTracker.collectExpired(now)
  → RetryDecision[]
      RETRY:     TopicDispatcher.processRetries → resend + metrics.recordRetry + eventPublisher.retry
      EXHAUSTED: lane.removeByMessageId + metrics.recordRetryExhausted + eventPublisher.retryExhausted

TopicDispatcher.acknowledge(clientId, ns, topic, messageId)
  → AckTracker.acknowledge → returns boolean
  → lane.removeByMessageId
  → scheduleDrain if lane.hasPendingSend
```

---

## 5. Error Handling & Edge Cases

| Scenario | Behaviour |
|---|---|
| User `ServerEventListener` callback throws | `ServerEventPublisher` swallows error — delivery engine unaffected |
| `TransportClient.sendEvent` throws (BEST_EFFORT) | Log error, continue drain |
| `TransportClient.sendEvent` throws (AT_LEAST_ONCE) | Log error, immediately ack+remove from lane and AckTracker |
| Unknown namespace/topic on `publish` | Throw `Error` — programmer error |
| `publishTo` — client not subscribed | Log warning, return (no enqueue) |
| Message bytes > `maxQueuedBytesPerClient` | `ClientLane.enqueue` returns `REJECTED` immediately |
| `TopicDispatcher.close()` | Stops `RetryService` ticker; in-flight drain microtasks complete safely |
| Duplicate ack | `AckTracker.acknowledge` is idempotent — returns `false`, caller no-ops |
| Empty `collectExpired` | Normal every-tick case — returns `[]`, zero work |
| `JSON.stringify` throws during byte estimation | Falls back to `1` byte |

---

## 6. Testing Strategy

**Framework:** Vitest 2 (same as Plan 1)
**Coverage targets:** ≥ 90% lines/statements/functions, ≥ 85% branches

### Test helpers (shared across delivery tests)

```typescript
// test/unit/internal/delivery/helpers.ts
makeFakeTransportClient(clientId?: string): FakeTransportClient
// FakeTransportClient records { eventName, args }[] calls, implements TransportClient

makeFakeListener(): FakeServerEventListener
// FakeServerEventListener records all callback invocations
```

### Key test cases per file

**`ClientLane.test.ts`** — overflow matrix: one `describe` per `OverflowAction`:
- Accept when under limit
- Reject/drop/coalesce/snapshot when at limit
- Byte limit rejection regardless of count
- `markAwaiting` / `inFlightCount` tracking
- `removeByMessageId` / `findByMessageId`

**`AckTracker.test.ts`** — injected `now` parameter:
- `register` + `acknowledge` removes from pending
- `collectExpired` returns `RETRY` before maxRetries, `EXHAUSTED` after
- Generational bump: re-registering after retry doesn't double-count
- `removeClient` / `removeClientTopic` bulk removal

**`TopicDispatcher.test.ts`** — integration-style using fakes:
- `publish` → enqueue → drain → `FakeTransportClient.sendEvent` called
- `AT_LEAST_ONCE`: drain respects `maxInFlight`, registers with AckTracker
- `acknowledge` → removes from lane → triggers follow-up drain
- `processRetries` → calls resend or removes exhausted

**`PromServerMetrics.test.ts`**:
- Call each `recordXxx`, assert `scrape()` output contains metric name and labels

---

## 7. Dependencies

```json
"dependencies": {
  "prom-client": "^15.1.3"
}
```

No other new runtime dependencies. `prom-client` is the only addition to `package.json`.

---

## 8. Public API Changes

`src/index.ts` gains one new export:

```typescript
export { PromServerMetrics } from './PromServerMetrics.js';
```

All delivery engine files live under `src/internal/` and are **not** exported publicly — they are implementation details. `TransportClient`, `TopicPolicy`, `ServerEventPublisher`, and the delivery classes are internal only.
