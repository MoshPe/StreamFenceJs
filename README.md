# StreamFenceJs - Embeddable JS Socket.IO Server Library

<p align="center">
  <img src="assets/logo.png" alt="StreamFence logo" width="320">
</p>

<p align="center">
  <a href="https://github.com/MoshPe/StreamFenceJs/actions/workflows/ci.yml"><img src="https://github.com/MoshPe/StreamFenceJs/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI"></a>
  <a href="https://github.com/MoshPe/StreamFenceJs/actions/workflows/codeql.yml"><img src="https://github.com/MoshPe/StreamFenceJs/actions/workflows/codeql.yml/badge.svg?branch=main" alt="CodeQL"></a>
  <a href="https://codecov.io/github/MoshPe/StreamFenceJs"><img src="https://codecov.io/github/MoshPe/StreamFenceJs/graph/badge.svg?token=EX8Z73CQZL"/></a>
  <a href="https://www.npmjs.com/package/streamfence-js"><img src="https://img.shields.io/npm/v/streamfence-js" alt="npm"></a>
  <a href="https://github.com/MoshPe/StreamFenceJs/releases"><img src="https://img.shields.io/github/v/release/MoshPe/StreamFenceJs" alt="GitHub Release"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg" alt="Node"></a>
  <a href="https://www.apache.org/licenses/LICENSE-2.0"><img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg" alt="License"></a>
</p>

Production-ready delivery control for Node.js Socket.IO servers — backpressure, retries, queue protection, and configurable per-namespace delivery modes.

TypeScript-first port of the Java [StreamFence](https://github.com/MoshPe/StreamFence) library.

---

## Table of contents

- [What it is](#what-it-is)
- [When to use one server vs two](#when-to-use-one-server-vs-two)
- [Install](#install)
- [Quick start](#quick-start)
- [Client-side protocol](#client-side-protocol)
- [Config file loading](#config-file-loading)
- [Delivery modes](#delivery-modes)
- [Overflow policies](#overflow-policies)
- [Spill to disk](#spill-to-disk)
- [Authentication](#authentication)
- [TLS](#tls)
- [Metrics & management](#metrics--management)
- [Event listeners](#event-listeners)
- [Server API reference](#server-api-reference)
- [NamespaceSpec builder](#namespacespec-builder)
- [API reference — exports](#api-reference--exports)
- [Examples](#examples)
- [Status / roadmap](#status--roadmap)
- [License](#license)

---

## What it is

StreamFenceJs wraps your Socket.IO server with a delivery control layer that prevents clients from being overwhelmed, ensures critical messages arrive even over unreliable connections, and gives you fine-grained observability into what happens when things go wrong.

Each Socket.IO namespace gets its own delivery policy: choose between fire-and-forget `BEST_EFFORT` or acknowledged `AT_LEAST_ONCE` delivery, configure per-client queue limits, and select an overflow strategy. The library handles per-client queuing, backpressure, retry scheduling, and Prometheus metrics — so your application code just calls `server.publish()`.

---

## When to use one server vs two

For most production workloads, run **two separate servers**:

| Server | Port | Namespaces | Delivery |
|---|---|---|---|
| Feed server | 3000 | `/feed`, `/prices`, `/updates` | `BEST_EFFORT` — high-frequency, loss-tolerant |
| Control server | 3001 | `/commands`, `/alerts` | `AT_LEAST_ONCE` — low-frequency, reliable |

**Why separate ports?** `AT_LEAST_ONCE` retries and acknowledgment tracking add per-message overhead. Mixing reliable and best-effort traffic on one server causes the reliable path's queue pressure to affect broadcast latency. Separating them keeps each server tuned to its workload.

Both servers can run in the same Node.js process.

---

## Install

```bash
npm install streamfence-js
```

Requires Node.js >= 20. If you want Prometheus metrics, install `prom-client` (peer dependency, version `>=14`):

```bash
npm install prom-client
```

---

## Quick start

```typescript
import {
  StreamFenceServerBuilder,
  NamespaceSpec,
  DeliveryMode,
  OverflowAction,
} from 'streamfence-js';

const feedSpec = NamespaceSpec.builder('/feed')
  .topic('snapshot')
  .deliveryMode(DeliveryMode.BEST_EFFORT)
  .overflowAction(OverflowAction.DROP_OLDEST)
  .maxQueuedMessagesPerClient(128)
  .build();

const server = new StreamFenceServerBuilder()
  .port(3000)
  .namespace(feedSpec)
  .buildServer();

await server.start();
console.log('Listening on port', server.port);

// Publish to all subscribers of /feed > snapshot
server.publish('/feed', 'snapshot', { price: 42.5, ts: Date.now() });

// Publish to a specific client only
server.publishTo('/feed', clientId, 'snapshot', { price: 42.5, ts: Date.now() });

// Graceful shutdown
process.on('SIGINT', async () => {
  await server.stop();
  process.exit(0);
});
```

---

## Client-side protocol

StreamFenceJs uses a simple event-based protocol over Socket.IO. Messages arrive on an event named after the **topic name** (not a generic `topic-message` event).

### Subscribing

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/feed', {
  transports: ['websocket'],
});

socket.on('connect', () => {
  // Subscribe to a topic. Pass a token if auth is enabled on the namespace.
  socket.emit('subscribe', { topic: 'snapshot', token: null });
});
```

### Receiving messages

Messages are emitted on the **topic name** as the Socket.IO event:

```javascript
// Listen for messages on the 'snapshot' topic
socket.on('snapshot', (payload) => {
  console.log('Received snapshot:', payload);
  // payload is whatever object was passed to server.publish()
});
```

### Acknowledging messages (AT_LEAST_ONCE only)

For `AT_LEAST_ONCE` namespaces, the server wraps each message with metadata. You must acknowledge receipt so the server does not retry:

```javascript
socket.on('alerts', (payload, metadata) => {
  console.log('Alert:', payload);

  // Acknowledge the message to stop retries
  if (metadata?.ackRequired) {
    socket.emit('ack', { topic: metadata.topic, messageId: metadata.messageId });
  }
});
```

If the server does not receive an `ack` within `ackTimeoutMs`, it will re-send the message up to `maxRetries` times.

### Unsubscribing

```javascript
socket.emit('unsubscribe', { topic: 'snapshot' });
```

---

## Config file loading

Instead of building servers programmatically you can load them from a YAML or JSON config file. A single file can define multiple named server entries.

```typescript
import { StreamFenceServerBuilder } from 'streamfence-js';

const feedServer = StreamFenceServerBuilder
  .fromYaml('./streamfence.yaml', { server: 'feed' })
  .buildServer();

const controlServer = StreamFenceServerBuilder
  .fromYaml('./streamfence.yaml', { server: 'control' })
  .buildServer();
```

You can continue customising the builder after loading:

```typescript
const server = StreamFenceServerBuilder
  .fromYaml('./streamfence.yaml', { server: 'feed' })
  .listener(myEventListener)
  .metrics(new PromServerMetrics(register))
  .buildServer();
```

### Config file schema

```yaml
servers:
  feed:                                    # server name — used in fromYaml/fromJson
    host: "0.0.0.0"                        # optional, default "0.0.0.0"
    port: 3000                             # required
    transport: WS                          # optional — WS | WSS, default WS
    engineIoTransport: WEBSOCKET_OR_POLLING  # optional — WEBSOCKET_ONLY | WEBSOCKET_OR_POLLING
    auth: NONE                             # optional — NONE | TOKEN, default NONE
    spillRootPath: ".streamfence-spill"    # optional, default ".streamfence-spill"
    tls:                                   # optional — required when transport: WSS
      certChainPemPath: "/etc/ssl/cert.pem"
      privateKeyPemPath: "/etc/ssl/key.pem"
      protocol: "TLSv1.3"                  # optional, default TLSv1.3
    namespaces:
      - path: /feed                        # required — must start with /
        topics: [snapshot, delta]          # required — at least one
        deliveryMode: BEST_EFFORT          # optional — BEST_EFFORT | AT_LEAST_ONCE
        overflowAction: DROP_OLDEST        # optional — see Overflow policies below
        maxQueuedMessagesPerClient: 128    # optional, default 64
        maxQueuedBytesPerClient: 1048576   # optional, default 524288 (512 KiB)
        ackTimeoutMs: 1000                 # optional, default 1000
        maxRetries: 0                      # optional, default 0
        coalesce: false                    # optional, default false
        allowPolling: true                 # optional, default true
        maxInFlight: 1                     # optional, default 1
        authRequired: false                # optional, default false
```

JSON format is also supported — same structure, `.json` extension. Use `fromJson()` instead of `fromYaml()`.

---

## Delivery modes

| Mode | Guarantee | Acks | Use case |
|---|---|---|---|
| `BEST_EFFORT` | At most once | None | Live feeds, price tickers, position updates |
| `AT_LEAST_ONCE` | At least once | Required | Commands, alerts, critical state changes |

### AT_LEAST_ONCE constraints

`AT_LEAST_ONCE` namespaces enforce the following at build time:

| Constraint | Reason |
|---|---|
| `overflowAction` must be `REJECT_NEW` or `SPILL_TO_DISK` | Other overflow actions silently discard messages, breaking at-least-once semantics. `SPILL_TO_DISK` is allowed because it preserves every message on disk. |
| `coalesce` must be `false` | Coalescing would replace messages that need individual acknowledgement |
| `maxRetries` must be >= 1 | At-least-once semantics require at least one retry attempt |
| `maxInFlight` must not exceed `maxQueuedMessagesPerClient` | In-flight limit cannot be larger than the queue itself |

---

## Overflow policies

Applied when a client's per-topic queue is full and a new message arrives.

| Action | Behaviour | Best for |
|---|---|---|
| `REJECT_NEW` | Incoming message rejected; publisher receives `QueueOverflowEvent` | `AT_LEAST_ONCE`; reliable back-pressure |
| `DROP_OLDEST` | Oldest queued message dropped; new message accepted | Live feeds where stale data is harmless |
| `COALESCE` | Most recent same-key entry replaced with new one; if no matching key found, message is rejected | Ticker data — only latest value per key matters |
| `SNAPSHOT_ONLY` | All queued messages discarded; only new message kept | Single-value snapshot feeds |
| `SPILL_TO_DISK` | Excess messages persist to disk; transparently recovered during drain | High-throughput feeds that cannot tolerate drops |

---

## Spill to disk

When a namespace uses `OverflowAction.SPILL_TO_DISK`, messages that exceed the in-memory queue limit are written to disk files under a configurable root directory. During drain, the queue transparently refills from disk in FIFO order, so all messages are delivered in the order they were published.

### How it works

1. Messages are enqueued in-memory up to `maxQueuedMessagesPerClient`.
2. When the in-memory queue is full, new messages are serialized to JSON and written to individual files on disk using atomic writes (write to `.tmp`, then rename).
3. When the in-memory queue drains, entries are recovered from disk and re-enqueued.
4. When a client disconnects, all spill files for that client are cleaned up.

### Configuration

```typescript
const server = new StreamFenceServerBuilder()
  .port(3000)
  .spillRootPath('/var/data/streamfence-spill')  // default: '.streamfence-spill'
  .namespace(
    NamespaceSpec.builder('/feed')
      .topic('data')
      .deliveryMode(DeliveryMode.BEST_EFFORT)
      .overflowAction(OverflowAction.SPILL_TO_DISK)
      .maxQueuedMessagesPerClient(64)
      .build(),
  )
  .buildServer();
```

Spill files are organized as:

```
{spillRootPath}/{namespace}/{clientId}/{topic}/00000001.json
```

### Metrics

Each message spilled to disk increments the `streamfence_messages_spilled_total` counter (labels: `namespace`, `topic`).

---

## Authentication

Set `auth: TOKEN` (config) or `.authMode(AuthMode.TOKEN)` (builder) and provide a `TokenValidator`:

```typescript
import { AuthMode, AuthDecision, type TokenValidator } from 'streamfence-js';

const validator: TokenValidator = {
  validate(token, namespace, topic) {
    if (token === 'secret-token') {
      return AuthDecision.accept('user-alice');
    }
    return AuthDecision.reject('invalid token');
  },
};

const server = new StreamFenceServerBuilder()
  .port(3000)
  .authMode(AuthMode.TOKEN)
  .tokenValidator(validator)
  .namespace(spec)
  .buildServer();
```

`TokenValidator.validate()` may return a plain `AuthDecision` or a `Promise<AuthDecision>` for async validation (database lookups, JWT verification, etc.).

When auth is enabled, clients must include a `token` in the subscribe payload:

```javascript
socket.emit('subscribe', { topic: 'snapshot', token: 'secret-token' });
```

---

## TLS

```typescript
import { TransportMode, TlsConfig } from 'streamfence-js';

const server = new StreamFenceServerBuilder()
  .port(3000)
  .transportMode(TransportMode.WSS)
  .tlsConfig(TlsConfig.create({
    certChainPemPath: '/etc/ssl/cert.pem',
    privateKeyPemPath: '/etc/ssl/key.pem',
    // protocol: 'TLSv1.3',       // default
    // privateKeyPassword: '...',  // optional
  }))
  .namespace(spec)
  .buildServer();
```

---

## Metrics & management

Use `PromServerMetrics` for Prometheus metrics. Pass your own `prom-client` registry — streamfence-js registers its counters into it. Mount the scrape route on your existing HTTP server; no extra port needed.

```typescript
import { register } from 'prom-client';
import { PromServerMetrics } from 'streamfence-js';

const server = new StreamFenceServerBuilder()
  .port(3000)
  .metrics(new PromServerMetrics(register))   // your existing registry
  .namespace(spec)
  .buildServer();

// Mount on your existing Express app
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

If you don't have a custom registry, omit the argument — it defaults to prom-client's global `register`:

```typescript
.metrics(new PromServerMetrics())
```

Using a dedicated isolated registry? Pass `new Registry()`:

```typescript
import { Registry } from 'prom-client';
const registry = new Registry();
.metrics(new PromServerMetrics(registry))
```

### Available metrics

| Metric | Labels | Description |
|---|---|---|
| `streamfence_connections_total` | `namespace` | Total successful client connections |
| `streamfence_disconnections_total` | `namespace` | Total client disconnections |
| `streamfence_messages_published_total` | `namespace`, `topic` | Total outbound messages published |
| `streamfence_messages_published_bytes_total` | `namespace`, `topic` | Total outbound message bytes published |
| `streamfence_messages_received_total` | `namespace`, `topic` | Total inbound messages received |
| `streamfence_messages_received_bytes_total` | `namespace`, `topic` | Total inbound message bytes received |
| `streamfence_queue_overflow_total` | `namespace`, `topic`, `reason` | Total queue overflow events |
| `streamfence_retries_total` | `namespace`, `topic` | Total retry attempts |
| `streamfence_retries_exhausted_total` | `namespace`, `topic` | Total exhausted retry outcomes |
| `streamfence_messages_dropped_total` | `namespace`, `topic` | Total dropped messages (DROP_OLDEST) |
| `streamfence_messages_coalesced_total` | `namespace`, `topic` | Total coalesced messages |
| `streamfence_messages_spilled_total` | `namespace`, `topic` | Total messages spilled to disk |
| `streamfence_auth_rejected_total` | `namespace` | Total auth rejections |
| `streamfence_auth_rate_limited_total` | `namespace` | Total auth rate-limited rejections |

---

## Event listeners

Register a listener via the builder's `.listener()` method or at runtime via `server.addListener()`. All callbacks are optional — implement only what you need. Exceptions thrown from callbacks are caught and logged; they never crash the server.

```typescript
import type { ServerEventListener } from 'streamfence-js';

const listener: ServerEventListener = {
  onServerStarted(event) {
    console.log(`Server started on ${event.host}:${event.port}`);
  },
  onClientConnected(event) {
    console.log('Client connected:', event.clientId, 'on', event.namespace);
  },
  onClientDisconnected(event) {
    console.log('Client disconnected:', event.clientId);
  },
  onSubscribed(event) {
    console.log('Subscribed:', event.clientId, '->', event.topic);
  },
  onPublishRejected(event) {
    console.warn('Publish rejected:', event.reasonCode, event.reason);
  },
  onQueueOverflow(event) {
    console.warn('Queue overflow:', event.namespace, event.topic, event.reason);
  },
  onRetryExhausted(event) {
    console.error('Retry exhausted:', event.messageId, 'after', event.retryCount, 'attempts');
  },
};

const server = new StreamFenceServerBuilder()
  .port(3000)
  .listener(listener)
  .namespace(spec)
  .buildServer();
```

### All callbacks and their event types

#### Server lifecycle

| Callback | Event type | Fields |
|---|---|---|
| `onServerStarting` | `ServerStartingEvent` | `host`, `port` |
| `onServerStarted` | `ServerStartedEvent` | `host`, `port` |
| `onServerStopping` | `ServerStoppingEvent` | `host`, `port` |
| `onServerStopped` | `ServerStoppedEvent` | `host`, `port` |

#### Client connection

| Callback | Event type | Fields |
|---|---|---|
| `onClientConnected` | `ClientConnectedEvent` | `namespace`, `clientId`, `transport` (`'websocket'` \| `'polling'`), `principal` (`string \| null`) |
| `onClientDisconnected` | `ClientDisconnectedEvent` | `namespace`, `clientId` |

#### Subscription

| Callback | Event type | Fields |
|---|---|---|
| `onSubscribed` | `SubscribedEvent` | `namespace`, `clientId`, `topic` |
| `onUnsubscribed` | `UnsubscribedEvent` | `namespace`, `clientId`, `topic` |

#### Publishing

| Callback | Event type | Fields |
|---|---|---|
| `onPublishAccepted` | `PublishAcceptedEvent` | `namespace`, `clientId`, `topic` |
| `onPublishRejected` | `PublishRejectedEvent` | `namespace`, `clientId`, `topic`, `reasonCode`, `reason` |
| `onQueueOverflow` | `QueueOverflowEvent` | `namespace`, `clientId`, `topic`, `reason` |

#### Authentication

| Callback | Event type | Fields |
|---|---|---|
| `onAuthRejected` | `AuthRejectedEvent` | `namespace`, `clientId`, `remoteAddress`, `reason` |

#### Retry (AT_LEAST_ONCE only)

| Callback | Event type | Fields |
|---|---|---|
| `onRetry` | `RetryEvent` | `namespace`, `clientId`, `topic`, `messageId`, `retryCount` (1-based) |
| `onRetryExhausted` | `RetryExhaustedEvent` | `namespace`, `clientId`, `topic`, `messageId`, `retryCount` |

---

## Server API reference

### `StreamFenceServerBuilder`

Fluent builder for server configuration.

| Method | Description |
|---|---|
| `host(value: string)` | Bind address (default `'0.0.0.0'`) |
| `port(value: number)` | Socket.IO listen port (use `0` for OS-assigned) |
| `transportMode(value: TransportModeValue)` | `WS` or `WSS` |
| `engineIoTransportMode(value)` | `WEBSOCKET_ONLY` or `WEBSOCKET_OR_POLLING` |
| `authMode(value: AuthModeValue)` | `NONE` or `TOKEN` |
| `tokenValidator(value: TokenValidator \| null)` | Custom token validation function |
| `tlsConfig(value: TlsConfig \| null)` | TLS certificate/key config (required for `WSS`) |
| `listener(value: ServerEventListener)` | Add an event listener (can be called multiple times) |
| `metrics(value: ServerMetrics)` | Metrics implementation (default `NoopServerMetrics`) |
| `spillRootPath(value: string)` | Root directory for disk spill files (default `'.streamfence-spill'`) |
| `namespace(value: NamespaceSpec)` | Add a namespace (at least one required) |
| `buildServer()` | Build and return a `StreamFenceServer` |
| `buildSpec()` | Build and return the immutable `StreamFenceServerSpec` |
| `static fromYaml(path, { server })` | Load config from YAML file |
| `static fromJson(path, { server })` | Load config from JSON file |

### `StreamFenceServer`

| Method / Property | Description |
|---|---|
| `start(): Promise<void>` | Start the Socket.IO server |
| `stop(): Promise<void>` | Graceful shutdown — disconnects clients, stops retry loop, closes port |
| `publish(namespace, topic, payload)` | Broadcast a message to all subscribers of a topic in a namespace |
| `publishTo(namespace, clientId, topic, payload)` | Send a message to a specific client only |
| `onMessage(namespace, topic, handler)` | Register a handler for inbound client messages on a topic |
| `addListener(listener: ServerEventListener)` | Register an event listener at runtime (after construction) |
| `metrics(): ServerMetrics` | Access the metrics instance |
| `port: number \| null` | Actual bound port after `start()` (useful when constructed with port `0`) |

---

## NamespaceSpec builder

Create namespace policies via `NamespaceSpec.builder('/path')`:

```typescript
const spec = NamespaceSpec.builder('/prices')
  .topics(['bid', 'ask', 'last'])          // register multiple topics at once
  .deliveryMode(DeliveryMode.BEST_EFFORT)
  .overflowAction(OverflowAction.COALESCE)
  .maxQueuedMessagesPerClient(128)
  .maxQueuedBytesPerClient(1_048_576)      // 1 MiB
  .coalesce(true)
  .build();
```

| Method | Default | Description |
|---|---|---|
| `topic(name: string)` | — | Add a single topic |
| `topics(names: string[])` | `[]` | Set multiple topics at once |
| `deliveryMode(mode)` | `BEST_EFFORT` | `BEST_EFFORT` or `AT_LEAST_ONCE` |
| `overflowAction(action)` | `REJECT_NEW` | Overflow strategy (see [Overflow policies](#overflow-policies)) |
| `maxQueuedMessagesPerClient(n)` | `64` | Max messages per client per topic before overflow applies |
| `maxQueuedBytesPerClient(n)` | `524288` (512 KiB) | Max total bytes queued per client; messages exceeding this are rejected |
| `ackTimeoutMs(n)` | `1000` | Timeout before retrying an unacknowledged message (AT_LEAST_ONCE) |
| `maxRetries(n)` | `0` | Max retry attempts per message (must be >= 1 for AT_LEAST_ONCE) |
| `coalesce(flag)` | `false` | Enable coalesce key matching for COALESCE overflow |
| `allowPolling(flag)` | `true` | Allow HTTP long-polling transport (set `false` to force WebSocket only) |
| `maxInFlight(n)` | `1` | Max messages awaiting acknowledgement simultaneously (AT_LEAST_ONCE) |
| `authRequired(flag)` | `false` | Require token auth for this namespace |
| `inboundAckPolicy(policy)` | `ACK_ON_RECEIPT` | When to acknowledge inbound messages: `ACK_ON_RECEIPT` or `ACK_AFTER_HANDLER_SUCCESS` |
| `build()` | — | Validate and return an immutable `NamespaceSpec` |

---

## API reference — exports

### Enums

| Export | Values |
|---|---|
| `DeliveryMode` | `BEST_EFFORT`, `AT_LEAST_ONCE` |
| `OverflowAction` | `DROP_OLDEST`, `REJECT_NEW`, `COALESCE`, `SNAPSHOT_ONLY`, `SPILL_TO_DISK` |
| `TransportMode` | `WS`, `WSS` |
| `AuthMode` | `NONE`, `TOKEN` |
| `EngineIoTransportMode` | `WEBSOCKET_ONLY`, `WEBSOCKET_OR_POLLING` |
| `InboundAckPolicy` | `ACK_ON_RECEIPT`, `ACK_AFTER_HANDLER_SUCCESS` |

### Classes & factories

| Export | Description |
|---|---|
| `StreamFenceServerBuilder` | Fluent builder for server configuration; `fromYaml()`, `fromJson()` static factories |
| `StreamFenceServer` | Running server instance — `start()`, `stop()`, `publish()`, `publishTo()`, `onMessage()`, `addListener()` |
| `NamespaceSpec` / `NamespaceSpecBuilder` | Namespace policy builder |
| `AuthDecision` | `accept(principal)` / `reject(reason)` factory |
| `TlsConfig` | `create(input)` factory |
| `PromServerMetrics` | Prometheus metrics implementation |
| `NoopServerMetrics` | No-op metrics (default) |

### Interfaces

| Export | Description |
|---|---|
| `TokenValidator` | Custom token authentication |
| `ServerEventListener` | Optional lifecycle + runtime event callbacks (14 hooks) |
| `ServerMetrics` | Metrics recording interface |
| `StreamFenceServerSpec` | Immutable server configuration |
| `InboundMessageContext` | Context passed to `onMessage` handlers |
| `InboundMessageHandler` | Handler type: `(payload, context) => void \| Promise<void>` |

### Event types

All event interfaces are exported for use in typed listener implementations:

`ServerStartingEvent`, `ServerStartedEvent`, `ServerStoppingEvent`, `ServerStoppedEvent`, `ClientConnectedEvent`, `ClientDisconnectedEvent`, `SubscribedEvent`, `UnsubscribedEvent`, `PublishAcceptedEvent`, `PublishRejectedEvent`, `QueueOverflowEvent`, `AuthRejectedEvent`, `RetryEvent`, `RetryExhaustedEvent`

---

## Examples

See [`examples/`](./examples/) for runnable code:

- **[single-server](./examples/single-server/)** — programmatic builder API, one namespace
- **[multi-namespace](./examples/multi-namespace/)** — one server with three namespaces: DROP_OLDEST prices, SNAPSHOT_ONLY portfolio, AT_LEAST_ONCE alerts
- **[mixed-workload](./examples/mixed-workload/)** — two servers from a single YAML config: a BEST_EFFORT feed server and an AT_LEAST_ONCE control server

Run with:

```bash
npx tsx examples/multi-namespace/server.ts
```

---

## Status / roadmap

v1 is complete and published. Planned for v2:

- TLS PEM hot reload
- Cluster-aware delivery (multi-process / multi-node)

---

## License

[Apache-2.0](LICENSE)
