# StreamFenceJs Plan 3 Transport & Server Assembly Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the first end-to-end usable StreamFence server by wiring Socket.IO transport, auth, subscriptions, and lifecycle management into the Plan 2 delivery engine.

**Architecture:** Keep all public API in `src/` and keep runtime wiring internals in `src/internal/*`. `StreamFenceServer` owns lifecycle and delegates delivery to `TopicDispatcher`, while transport adapters translate Socket.IO events into internal protocol records. Integration tests validate behavior through real Socket.IO client/server interactions.

**Tech Stack:** TypeScript 5.x, Socket.IO (`socket.io`, `socket.io-client`), Node `http`/`https`, Vitest 2 (unit + integration), existing Plan 2 delivery core.

---

### Task 1: Add Transport Dependencies And Integration Test Baseline

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `test/integration/.gitkeep`

**Step 1: Write the failing test**

Create `test/integration/transport-smoke.test.ts` with one test that imports `Server` from `socket.io` and `io` from `socket.io-client` and attempts a simple connect/disconnect lifecycle.

**Step 2: Run test to verify it fails**

Run: `npm test -- test/integration/transport-smoke.test.ts`
Expected: FAIL with module resolution errors for `socket.io` and/or `socket.io-client`.

**Step 3: Write minimal implementation**

Add runtime dependencies:
- `socket.io`
- `socket.io-client`

Create `test/integration/.gitkeep` so integration suite path exists before adding more tests.

**Step 4: Run test to verify it passes**

Run: `npm test -- test/integration/transport-smoke.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add package.json package-lock.json test/integration/.gitkeep test/integration/transport-smoke.test.ts
git commit -m "chore(plan-3): add socket transport dependencies and integration baseline"
```

### Task 2: Add Public Plan 3 API Types

**Files:**
- Create: `src/EngineIoTransportMode.ts`
- Create: `src/InboundAckPolicy.ts`
- Create: `src/InboundMessageContext.ts`
- Modify: `src/NamespaceSpec.ts`
- Modify: `src/index.ts`
- Create: `test/unit/EngineIoTransportMode.test.ts`
- Create: `test/unit/InboundAckPolicy.test.ts`
- Create: `test/unit/InboundMessageContext.test.ts`
- Modify: `test/unit/NamespaceSpec.test.ts`

**Step 1: Write the failing test**

Add tests for:
- enum literals and type values for `EngineIoTransportMode` and `InboundAckPolicy`
- `NamespaceSpec` default `inboundAckPolicy`
- `NamespaceSpecBuilder.inboundAckPolicy(...)`
- immutable `InboundMessageContext` shape

**Step 2: Run test to verify it fails**

Run: `npm test -- test/unit/EngineIoTransportMode.test.ts test/unit/InboundAckPolicy.test.ts test/unit/InboundMessageContext.test.ts test/unit/NamespaceSpec.test.ts`
Expected: FAIL because new public types and builder field are missing.

**Step 3: Write minimal implementation**

Implement the three new public types and extend `NamespaceSpec`/builder with:
- `inboundAckPolicy` field
- builder setter
- default value `ACK_ON_RECEIPT`

Export all new types from `src/index.ts`.

**Step 4: Run test to verify it passes**

Run: `npm test -- test/unit/EngineIoTransportMode.test.ts test/unit/InboundAckPolicy.test.ts test/unit/InboundMessageContext.test.ts test/unit/NamespaceSpec.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/EngineIoTransportMode.ts src/InboundAckPolicy.ts src/InboundMessageContext.ts src/NamespaceSpec.ts src/index.ts test/unit/EngineIoTransportMode.test.ts test/unit/InboundAckPolicy.test.ts test/unit/InboundMessageContext.test.ts test/unit/NamespaceSpec.test.ts
git commit -m "feat(api): add plan-3 transport and inbound ack public types"
```

### Task 3: Add StreamFence Server Spec, Builder, And Runtime Shell

**Files:**
- Create: `src/StreamFenceServerSpec.ts`
- Create: `src/StreamFenceServerBuilder.ts`
- Create: `src/StreamFenceServer.ts`
- Create: `test/unit/StreamFenceServerSpec.test.ts`
- Create: `test/unit/StreamFenceServerBuilder.test.ts`
- Create: `test/unit/StreamFenceServer.test.ts`
- Modify: `src/index.ts`

**Step 1: Write the failing test**

Cover:
- builder defaults
- duplicate namespace rejection
- immutable `StreamFenceServerSpec`
- `StreamFenceServer` constructor wiring and lifecycle guard rails (`start()` idempotence, `stop()` safe before start)

**Step 2: Run test to verify it fails**

Run: `npm test -- test/unit/StreamFenceServerSpec.test.ts test/unit/StreamFenceServerBuilder.test.ts test/unit/StreamFenceServer.test.ts`
Expected: FAIL because public server classes do not exist.

**Step 3: Write minimal implementation**

Implement:
- immutable spec record
- fluent builder that produces the spec
- `StreamFenceServer` shell with method signatures:
  - `start()`
  - `stop()`
  - `publish(...)`
  - `publishTo(...)`
  - `onMessage(...)`
  - `addListener(...)`
  - `metrics()`

No transport wiring yet; only runtime state and argument validation.

**Step 4: Run test to verify it passes**

Run: `npm test -- test/unit/StreamFenceServerSpec.test.ts test/unit/StreamFenceServerBuilder.test.ts test/unit/StreamFenceServer.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/StreamFenceServerSpec.ts src/StreamFenceServerBuilder.ts src/StreamFenceServer.ts src/index.ts test/unit/StreamFenceServerSpec.test.ts test/unit/StreamFenceServerBuilder.test.ts test/unit/StreamFenceServer.test.ts
git commit -m "feat(server): add server spec, builder, and runtime shell"
```

### Task 4: Add Security Components For Namespace Handshake

**Files:**
- Create: `src/internal/security/TokenExtractor.ts`
- Create: `src/internal/security/StaticTokenValidator.ts`
- Create: `src/internal/security/AuthRateLimiter.ts`
- Create: `test/unit/internal/security/TokenExtractor.test.ts`
- Create: `test/unit/internal/security/StaticTokenValidator.test.ts`
- Create: `test/unit/internal/security/AuthRateLimiter.test.ts`

**Step 1: Write the failing test**

Cover:
- token extraction order (`handshake.auth.token`, then bearer header)
- static token matching
- rate-limiter behavior with injected clock

**Step 2: Run test to verify it fails**

Run: `npm test -- test/unit/internal/security/TokenExtractor.test.ts test/unit/internal/security/StaticTokenValidator.test.ts test/unit/internal/security/AuthRateLimiter.test.ts`
Expected: FAIL because security modules do not exist.

**Step 3: Write minimal implementation**

Implement small deterministic utilities with no Socket.IO hard dependency types in signatures.

**Step 4: Run test to verify it passes**

Run: `npm test -- test/unit/internal/security/TokenExtractor.test.ts test/unit/internal/security/StaticTokenValidator.test.ts test/unit/internal/security/AuthRateLimiter.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/internal/security/TokenExtractor.ts src/internal/security/StaticTokenValidator.ts src/internal/security/AuthRateLimiter.ts test/unit/internal/security/TokenExtractor.test.ts test/unit/internal/security/StaticTokenValidator.test.ts test/unit/internal/security/AuthRateLimiter.test.ts
git commit -m "feat(security): add handshake token extraction and auth throttling"
```

### Task 5: Add Transport Bootstrap And Management HTTP Server

**Files:**
- Create: `src/internal/transport/SocketServerBootstrap.ts`
- Create: `src/internal/observability/ManagementHttpServer.ts`
- Create: `test/unit/internal/transport/SocketServerBootstrap.test.ts`
- Create: `test/unit/internal/observability/ManagementHttpServer.test.ts`

**Step 1: Write the failing test**

Cover:
- bootstrap creates HTTP server and Socket.IO instance with configured Engine.IO transport mode
- management server exposes `/health` and `/metrics`

**Step 2: Run test to verify it fails**

Run: `npm test -- test/unit/internal/transport/SocketServerBootstrap.test.ts test/unit/internal/observability/ManagementHttpServer.test.ts`
Expected: FAIL because bootstrap and management implementations do not exist.

**Step 3: Write minimal implementation**

Implement lifecycle-managed wrappers:
- `start()`/`stop()` for bootstrap
- optional management server that consumes injected health and metrics providers

**Step 4: Run test to verify it passes**

Run: `npm test -- test/unit/internal/transport/SocketServerBootstrap.test.ts test/unit/internal/observability/ManagementHttpServer.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/internal/transport/SocketServerBootstrap.ts src/internal/observability/ManagementHttpServer.ts test/unit/internal/transport/SocketServerBootstrap.test.ts test/unit/internal/observability/ManagementHttpServer.test.ts
git commit -m "feat(transport): add socket bootstrap and management endpoints"
```

### Task 6: Add Namespace Transport Adapter

**Files:**
- Create: `src/internal/transport/ConnectedClientAdapter.ts`
- Create: `src/internal/transport/NamespaceHandler.ts`
- Create: `test/integration/namespace-subscribe-flow.test.ts`
- Create: `test/integration/publish-delivery-flow.test.ts`

**Step 1: Write the failing test**

Cover:
- subscribe/unsubscribe protocol
- publish to subscribed clients only
- disconnect cleanup

**Step 2: Run test to verify it fails**

Run: `npm test -- test/integration/namespace-subscribe-flow.test.ts test/integration/publish-delivery-flow.test.ts`
Expected: FAIL because namespace adapter is missing.

**Step 3: Write minimal implementation**

Implement Socket.IO namespace event mapping to:
- `ClientSessionRegistry`
- `TopicDispatcher`
- protocol records (`SubscriptionRequest`, `PublishRequest`, `AckPayload`)

`ConnectedClientAdapter` must implement `TransportClient` and forward `sendEvent` to socket emit.

**Step 4: Run test to verify it passes**

Run: `npm test -- test/integration/namespace-subscribe-flow.test.ts test/integration/publish-delivery-flow.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/internal/transport/ConnectedClientAdapter.ts src/internal/transport/NamespaceHandler.ts test/integration/namespace-subscribe-flow.test.ts test/integration/publish-delivery-flow.test.ts
git commit -m "feat(transport): wire namespace subscribe and publish flow"
```

### Task 7: Wire Reliable Delivery Retry/Ack In Transport

**Files:**
- Modify: `src/internal/transport/NamespaceHandler.ts`
- Modify: `src/StreamFenceServer.ts`
- Create: `test/integration/reliable-delivery-retry.test.ts`

**Step 1: Write the failing test**

Cover:
- `AT_LEAST_ONCE` retry until ack
- retry exhaustion path
- `TopicDispatcher.acknowledge(...)` called on inbound ack payload

**Step 2: Run test to verify it fails**

Run: `npm test -- test/integration/reliable-delivery-retry.test.ts`
Expected: FAIL because transport retry/ack wiring is incomplete.

**Step 3: Write minimal implementation**

Wire ack event ingress to dispatcher and periodic retry processing through `RetryService` while server is running.

**Step 4: Run test to verify it passes**

Run: `npm test -- test/integration/reliable-delivery-retry.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/internal/transport/NamespaceHandler.ts src/StreamFenceServer.ts test/integration/reliable-delivery-retry.test.ts
git commit -m "feat(server): wire reliable outbound ack and retry handling"
```

### Task 8: Final Server Assembly, Export Surface, And Full Verification

**Files:**
- Modify: `src/StreamFenceServer.ts`
- Modify: `src/StreamFenceServerBuilder.ts`
- Modify: `src/index.ts`
- Create: `test/integration/streamfence-server-lifecycle.test.ts`
- Create: `test/integration/streamfence-server-publish-to.test.ts`

**Step 1: Write the failing test**

Cover:
- full `start()`/`stop()` lifecycle
- `publishTo()` targets one connected subscribed client
- management `/metrics` includes counters from real runtime activity

**Step 2: Run test to verify it fails**

Run: `npm test -- test/integration/streamfence-server-lifecycle.test.ts test/integration/streamfence-server-publish-to.test.ts`
Expected: FAIL until final assembly is complete.

**Step 3: Write minimal implementation**

Finish server orchestration:
- instantiate topic policies from namespace specs
- create registries/dispatcher/bootstrap/management server
- connect listeners and close resources on stop

Update root exports for all Plan 3 public types.

**Step 4: Run test to verify it passes**

Run:
- `npm run typecheck`
- `npm test`
- `npm run build`

Expected: all PASS.

**Step 5: Commit**

```bash
git add src/StreamFenceServer.ts src/StreamFenceServerBuilder.ts src/index.ts test/integration/streamfence-server-lifecycle.test.ts test/integration/streamfence-server-publish-to.test.ts
git commit -m "feat(plan-3): assemble streamfence server runtime"
```

---

## Acceptance Checklist

- Transport dependencies and integration test harness are in place.
- Public Plan 3 API types are exported and documented by tests.
- Server builder/spec runtime APIs are stable and immutable.
- Security handshake/token/rate-limit helpers are covered by unit tests.
- Namespace adapter routes subscribe/publish/ack flows into the delivery core.
- Reliable delivery retries and acknowledgments work end-to-end.
- Lifecycle, targeted publish, and metrics endpoint behavior are integration tested.
- `npm run typecheck`, `npm test`, and `npm run build` are green.
