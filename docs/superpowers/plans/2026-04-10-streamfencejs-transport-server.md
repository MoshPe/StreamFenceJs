# StreamFenceJs Transport And Server Assembly Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the public server API and the complete transport assembly around the Plan 2 delivery core: Socket.IO bootstrap, namespace routing, explicit subscriptions, auth, management HTTP endpoints, TLS support, and end-to-end integration behavior.

**Architecture:** This plan is the first one allowed to depend on Socket.IO. Public server classes stay flat under `src/`, transport/security helpers stay under `src/internal/*`, and the server assembly adapts connected clients into the already-tested delivery engine. The resulting API must support both the recommended two-server mixed-workload pattern and a smaller single-server deployment.

**Tech Stack:** TypeScript 5.x, Socket.IO server/client, Node `http`/`https`, Node `tls`, Vitest 2 integration tests, existing delivery-core types from Plan 2.

**Baseline:** Start only after Plan 2 is complete and green.

---

## Task 1: Add Transport Dependencies And Integration Test Layout

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `test/integration/.gitkeep`

- [ ] **Step 1: Add runtime and test dependencies**

Add:

- `socket.io`
- `socket.io-client`

Do not add YAML parsing here; that belongs to Plan 4.

- [ ] **Step 2: Install and lock**

Run: `npm install`

- [ ] **Step 3: Create integration test directory**

Create `test/integration/`.

- [ ] **Step 4: Verify the Plan 2 baseline still passes**

Run: `npm run typecheck && npm test`

- [ ] **Step 5: Commit**

Commit: `chore: add transport dependencies and integration test layout`

## Task 2: Add Remaining Public Config Types

**Files:**
- Create: `src/EngineIoTransportMode.ts`
- Create: `src/InboundAckPolicy.ts`
- Modify: `src/NamespaceSpec.ts`
- Modify: `src/TlsConfig.ts`
- Create: `test/unit/EngineIoTransportMode.test.ts`
- Create: `test/unit/InboundAckPolicy.test.ts`
- Modify: `test/unit/NamespaceSpec.test.ts`
- Modify: `test/unit/TlsConfig.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write failing tests**

Cover:

- server-level Engine.IO transport selection is distinct from `TransportMode`
- `EngineIoTransportMode` supports `WEBSOCKET_ONLY` and `WEBSOCKET_OR_POLLING`
- `InboundAckPolicy` supports `ACK_ON_RECEIPT` and `ACK_AFTER_HANDLER_SUCCESS`
- `NamespaceSpec` defaults inbound ack policy to `ACK_ON_RECEIPT`
- `NamespaceSpec.allowPolling(false)` remains valid and is enforced later by transport layer
- `TlsConfig` gains hot-reload support through explicit fields:
  - `hotReloadEnabled`
  - `hotReloadDebounceMs`

- [ ] **Step 2: Run targeted tests and confirm red**

- [ ] **Step 3: Implement the config extensions**

Implementation requirements:

- keep existing `TransportMode` unchanged
- extend `NamespaceSpecBuilder` with `inboundAckPolicy(...)`
- extend `TlsConfig.create()` validation without breaking current callers
- default TLS hot reload off

- [ ] **Step 4: Re-run targeted tests**

Expected: green.

- [ ] **Step 5: Commit**

Commit: `feat(api): add transport and inbound ack config types`

## Task 3: Add Public Server Surface

**Files:**
- Create: `src/StreamFenceServerSpec.ts`
- Create: `src/StreamFenceServerBuilder.ts`
- Create: `src/StreamFenceServer.ts`
- Create: `src/InboundMessageContext.ts`
- Create: `test/unit/StreamFenceServerSpec.test.ts`
- Create: `test/unit/StreamFenceServerBuilder.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write failing tests**

Cover:

- builder defaults for host, ports, transport modes, auth mode, listeners, metrics, and namespaces
- builder rejects duplicate namespace paths
- `buildServer()` refuses to build without at least one namespace
- `StreamFenceServerSpec` is immutable and serializable
- message handler context contains client id, namespace, topic, message id, principal, and receipt timestamp

- [ ] **Step 2: Run targeted tests and confirm red**

- [ ] **Step 3: Implement the public server types**

Implementation requirements:

- `StreamFenceServer.builder()` is the only public constructor path
- spec stores:
  - host
  - port
  - optional management port
  - transport mode
  - Engine.IO transport mode
  - auth mode
  - optional token validator
  - optional TLS config
  - listener list
  - metrics instance
  - spill root path
  - namespace specs
- `StreamFenceServer` public methods should already be declared here even if some internals are added later in this plan:
  - `start()`
  - `stop()`
  - `publish(namespace, topic, payload)`
  - `publishTo(namespace, clientId, topic, payload)`
  - `onMessage(namespace, topic, handler)`
  - `addListener(listener)`
  - `metrics()`

- [ ] **Step 4: Re-run targeted tests**

Expected: green.

- [ ] **Step 5: Commit**

Commit: `feat(api): add public server spec and builder`

## Task 4: Add TLS Material Loading And Optional Hot Reload

**Files:**
- Create: `src/internal/transport/PemTlsMaterialLoader.ts`
- Create: `src/internal/transport/PemReloadWatcher.ts`
- Create: `test/unit/internal/transport/PemTlsMaterialLoader.test.ts`
- Create: `test/unit/internal/transport/PemReloadWatcher.test.ts`

- [ ] **Step 1: Write failing tests**

Cover:

- PEM cert and key load from configured paths
- private-key password is passed through when present
- watcher debounce works and emits one reload request per change burst
- watcher no-ops cleanly when hot reload is disabled

- [ ] **Step 2: Run targeted tests and confirm red**

- [ ] **Step 3: Implement TLS helpers**

Implementation requirements:

- loader returns `https.ServerOptions`-compatible material
- watcher lifecycle is explicit: `start()`, `stop()`
- watcher depends on injected callback, not on global server state

- [ ] **Step 4: Re-run targeted tests**

Expected: green.

- [ ] **Step 5: Commit**

Commit: `feat(transport): add pem loading and hot reload watcher`

## Task 5: Add Bootstrap And Management HTTP Server

**Files:**
- Create: `src/internal/transport/SocketServerBootstrap.ts`
- Create: `src/internal/observability/ManagementHttpServer.ts`
- Create: `test/unit/internal/transport/SocketServerBootstrap.test.ts`
- Create: `test/unit/internal/observability/ManagementHttpServer.test.ts`

- [ ] **Step 1: Write failing tests**

Cover:

- bootstrap creates HTTP server for `WS` and HTTPS server for `WSS`
- Engine.IO transport mode maps correctly to Socket.IO transport config
- management server serves `/health` and `/metrics` on a separate optional port
- `/health` returns healthy state only after main server start
- `/metrics` delegates to the configured metrics instance

- [ ] **Step 2: Run targeted tests and confirm red**

- [ ] **Step 3: Implement bootstrap and management server**

Implementation requirements:

- main and management servers are independently startable/stoppable
- `/health` response is JSON and includes at least `status` and `uptimeMs`
- do not couple management server to delivery internals; it should query small injected functions

- [ ] **Step 4: Re-run targeted tests**

Expected: green.

- [ ] **Step 5: Commit**

Commit: `feat(transport): add socket bootstrap and management server`

## Task 6: Add Security Helpers

**Files:**
- Create: `src/internal/security/AuthRateLimiter.ts`
- Create: `src/internal/security/StaticTokenValidator.ts`
- Create: `src/internal/security/TokenExtractor.ts`
- Create: `test/unit/internal/security/AuthRateLimiter.test.ts`
- Create: `test/unit/internal/security/StaticTokenValidator.test.ts`
- Create: `test/unit/internal/security/TokenExtractor.test.ts`

- [ ] **Step 1: Write failing tests**

Cover:

- token extraction order:
  - `socket.handshake.auth.token`
  - bearer token from `Authorization` header
- missing token behavior
- static validator accepts configured tokens and rejects others
- auth rate limiter blocks repeated failures by remote address and resets after cooldown

- [ ] **Step 2: Run targeted tests and confirm red**

- [ ] **Step 3: Implement security helpers**

Implementation requirements:

- extraction helpers should depend on a small handshake-like shape, not full Socket.IO types
- limiter must be deterministic and clock-injectable for tests
- rejection reasons should be usable in listener events and error payloads

- [ ] **Step 4: Re-run targeted tests**

Expected: green.

- [ ] **Step 5: Commit**

Commit: `feat(security): add token extraction and auth rate limiting`

## Task 7: Add Namespace Transport Adapter

**Files:**
- Create: `src/internal/transport/NamespaceHandler.ts`
- Create: `src/internal/transport/ConnectedClientAdapter.ts`
- Create: `test/integration/namespace-subscriptions.test.ts`

- [ ] **Step 1: Write failing integration tests**

Cover:

- explicit subscribe and unsubscribe requests
- only subscribed clients receive published topic messages
- namespace connect is rejected when polling is used but `allowPolling` is false
- client disconnect cleans session registry and topic registry state

- [ ] **Step 2: Run targeted integration test and confirm red**

- [ ] **Step 3: Implement namespace adapter**

Implementation requirements:

- translate Socket.IO namespace events into Plan 2 delivery-core operations
- create one `ClientLane` per connected client per namespace
- decode `SubscriptionRequest` and inbound publish message envelopes from socket events
- maintain no transport state outside the registries and lane map

- [ ] **Step 4: Re-run integration test**

Expected: green.

- [ ] **Step 5: Commit**

Commit: `feat(transport): add namespace handler and explicit subscriptions`

## Task 8: Wire Reliable Delivery And Inbound Message Handling

**Files:**
- Modify: `src/internal/transport/NamespaceHandler.ts`
- Modify: `src/StreamFenceServer.ts`
- Create: `test/integration/reliable-delivery.test.ts`
- Create: `test/integration/inbound-ack-policies.test.ts`

- [ ] **Step 1: Write failing integration tests**

Cover:

- server -> client `AT_LEAST_ONCE` delivery retries until ack
- retries stop after ack
- retries exhaust after `maxRetries`
- client -> server `ACK_ON_RECEIPT` acks immediately before handler completion
- client -> server `ACK_AFTER_HANDLER_SUCCESS` waits for handler success
- handler failure under `ACK_AFTER_HANDLER_SUCCESS` results in no ack

- [ ] **Step 2: Run targeted integration tests and confirm red**

- [ ] **Step 3: Implement reliable transport wiring**

Implementation requirements:

- outbound acks feed `AckTracker`
- retry work items from `RetryService` re-enter transport send path cleanly
- inbound message handler registration is by namespace and topic
- no duplicate handler invocation on one inbound socket message

- [ ] **Step 4: Re-run integration tests**

Expected: green.

- [ ] **Step 5: Commit**

Commit: `feat(server): add reliable delivery and inbound ack policies`

## Task 9: Assemble `StreamFenceServer`

**Files:**
- Modify: `src/StreamFenceServer.ts`
- Modify: `src/StreamFenceServerBuilder.ts`
- Create: `test/integration/streamfence-server-smoke.test.ts`
- Create: `test/integration/targeted-publish.test.ts`
- Create: `test/integration/mixed-workload-two-server.test.ts`

- [ ] **Step 1: Write failing integration tests**

Cover:

- `start()` and `stop()` lifecycle
- broadcast publish
- targeted publish to one client
- recommended two-server mixed-workload deployment:
  - feed server websocket-only
  - control server reliable and polling-capable
- listener callbacks fire for lifecycle and publish outcomes

- [ ] **Step 2: Run targeted integration tests and confirm red**

- [ ] **Step 3: Finish server assembly**

Implementation requirements:

- `StreamFenceServer` owns bootstrap, management server, registries, dispatcher, retry service, and listener publisher
- `publish()` serializes once per call
- `publishTo()` targets exactly one connected subscribed client
- `stop()` drains resources, stops watchers, purges spill state, and closes management port if enabled

- [ ] **Step 4: Re-run integration tests**

Expected: green.

- [ ] **Step 5: Commit**

Commit: `feat(server): assemble streamfence server`

## Task 10: Add Auth And WSS Integration Coverage

**Files:**
- Create: `test/integration/auth-token.test.ts`
- Create: `test/integration/wss-startup.test.ts`

- [ ] **Step 1: Write failing integration tests**

Cover:

- `AuthMode.TOKEN` with handshake auth payload
- bearer header fallback
- auth rejection emits listener events and returns error payloads
- WSS startup succeeds with PEM files
- hot reload watcher can be started without crashing during server runtime

- [ ] **Step 2: Run targeted integration tests and confirm red**

- [ ] **Step 3: Fill integration gaps**

Implement whatever minimal glue is still missing to pass the tests without changing earlier semantics.

- [ ] **Step 4: Re-run integration tests**

Expected: green.

- [ ] **Step 5: Commit**

Commit: `test(server): add auth and wss integration coverage`

## Task 11: Final Transport/Server Verification

**Files:**
- Modify: `src/index.ts`
- Verify: `dist/index.d.ts`

- [ ] **Step 1: Export the new public API**

Root exports after this plan must include:

- `StreamFenceServer`
- `StreamFenceServerBuilder`
- `StreamFenceServerSpec`
- `InboundMessageContext`
- `EngineIoTransportMode`
- `InboundAckPolicy`
- `StaticTokenValidator`

- [ ] **Step 2: Run full verification**

Run:

- `npm run typecheck`
- `npm test`
- `npm run test:coverage`
- `npm run build`

Expected: green across unit and integration suites.

- [ ] **Step 3: Spot-check declarations and package output**

Confirm `dist/index.d.ts` contains the public server symbols and still hides transport internals.

- [ ] **Step 4: Commit**

Commit: `chore: verify transport and server assembly completion`

- [ ] **Step 5: Report handoff state**

State to the user that Plan 3 is complete and that the library is functionally usable end-to-end, with Plan 4 remaining for config parity, examples, docs, and publish polish.

## Acceptance Checklist

- WebSocket-only and polling-enabled server modes work as designed.
- Namespace topic subscriptions are explicit and enforced.
- Reliable delivery works end-to-end in integration tests.
- Client -> server ack policy is namespace-configurable.
- Auth token extraction and rate limiting are wired.
- Optional management port serves `/health` and `/metrics`.
- WSS startup and PEM hot reload plumbing are in place.
