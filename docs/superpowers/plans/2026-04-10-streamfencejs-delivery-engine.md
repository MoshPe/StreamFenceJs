# StreamFenceJs Delivery Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the full socket-free delivery core for `streamfence-js`: serialized-message lifecycle management, queue enforcement, overflow policies, retry bookkeeping, per-topic registries, event publishing, and the real Prometheus-backed metrics collector.

**Architecture:** Keep this plan pure and transport-agnostic. The delivery layer owns queue state, retry state, spill-to-disk state, and metrics/event emission, but it must not depend on Socket.IO types. Transport-facing code in Plan 3 will adapt connected clients into this core through narrow callbacks and state holders.

**Tech Stack:** TypeScript 5.x, Vitest 2, prom-client, Node.js `fs/promises` and `path`, existing tsup/eslint/prettier toolchain.

**Baseline:** Implement on top of the completed foundation in `src/` and `src/internal/protocol/`.

---

## Task 1: Add Delivery-Engine Dependencies And Test Scaffolding

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `test/unit/internal/delivery/.gitkeep`
- Create: `test/unit/internal/observability/.gitkeep`

- [ ] **Step 1: Add runtime dependency**

Add `prom-client` to `package.json`. Do not add Socket.IO here.

- [ ] **Step 2: Install and lock**

Run: `npm install`

Expected: `package-lock.json` updates and the repo still typechecks.

- [ ] **Step 3: Create test directories**

Create:

- `test/unit/internal/delivery/`
- `test/unit/internal/observability/`

- [ ] **Step 4: Verify the baseline still passes**

Run: `npm run typecheck && npm test`

Expected: existing Plan 1 tests remain green before new work starts.

- [ ] **Step 5: Commit**

Commit: `chore: add delivery engine dependencies and test directories`

## Task 2: Add Immutable Delivery Primitives

**Files:**
- Create: `src/internal/delivery/PublishedMessage.ts`
- Create: `src/internal/delivery/LaneEntry.ts`
- Create: `src/internal/delivery/EnqueueStatus.ts`
- Create: `src/internal/delivery/EnqueueResult.ts`
- Create: `src/internal/delivery/RetryAction.ts`
- Create: `src/internal/delivery/RetryDecision.ts`
- Create: `test/unit/internal/delivery/PublishedMessage.test.ts`
- Create: `test/unit/internal/delivery/LaneEntry.test.ts`
- Create: `test/unit/internal/delivery/EnqueueResult.test.ts`
- Create: `test/unit/internal/delivery/RetryDecision.test.ts`

- [ ] **Step 1: Write failing tests for immutable primitives**

Cover:

- `PublishedMessage.create()` stores topic, payload bytes, metadata, mode, and byte length.
- payload bytes are exposed read-only through defensive copies or readonly `Uint8Array` views.
- message lifecycle is explicit: `retain()`, `release()`, `refCount`, `disposed`.
- disposal callback fires exactly once when the refcount reaches zero.
- `LaneEntry` captures `PublishedMessage`, enqueue timestamp, attempt number, optional spill marker, and client target id.
- `EnqueueStatus` contains exactly `ACCEPTED`, `DROPPED_OLD`, `REJECTED`, `SPILLED`, `DISCONNECTED`.
- `RetryAction` contains exactly `RETRY`, `GIVE_UP`.
- `RetryDecision` is an immutable value object with helpers for `retry(attempt, nextDelayMs)` and `giveUp(attempt)`.

- [ ] **Step 2: Run targeted tests and confirm red**

Run each new spec with `npx vitest run ...`.

Expected: missing module failures.

- [ ] **Step 3: Implement the primitives**

Implementation requirements:

- `PublishedMessage` owns a single serialized payload buffer for fan-out.
- `PublishedMessage.create()` takes metadata plus payload bytes, computes `byteLength`, starts at `refCount = 1`, and freezes public shape.
- `retain()` increments until disposal; `release()` decrements and throws on underflow.
- `LaneEntry` is immutable and stores only references and queue bookkeeping, never copies payload bytes.
- `EnqueueResult` includes `status`, `acceptedEntry`, `droppedEntries`, `spilledEntry`, and `reason`.
- `RetryDecision` never allows negative attempt or delay.

- [ ] **Step 4: Re-run targeted tests to green**

Run: `npx vitest run test/unit/internal/delivery/PublishedMessage.test.ts test/unit/internal/delivery/LaneEntry.test.ts test/unit/internal/delivery/EnqueueResult.test.ts test/unit/internal/delivery/RetryDecision.test.ts`

Expected: all pass.

- [ ] **Step 5: Commit**

Commit: `feat(delivery): add immutable delivery primitives`

## Task 3: Add Session And Topic Registries

**Files:**
- Create: `src/internal/delivery/ClientSessionState.ts`
- Create: `src/internal/delivery/ClientSessionRegistry.ts`
- Create: `src/internal/delivery/TopicRegistry.ts`
- Create: `test/unit/internal/delivery/ClientSessionRegistry.test.ts`
- Create: `test/unit/internal/delivery/TopicRegistry.test.ts`

- [ ] **Step 1: Write failing tests**

Cover:

- session add/remove/get/has/list semantics by namespace and client id
- duplicate register replaces prior state only when explicitly requested; otherwise throw
- disconnect cleanup unsubscribes the session from every topic
- topic registry supports `subscribe`, `unsubscribe`, `unsubscribeAll`, `subscribers(topic)`, `topicsFor(clientId)`
- subscription order is deterministic and duplicate subscriptions are idempotent

- [ ] **Step 2: Run tests and confirm red**

Run targeted Vitest files.

- [ ] **Step 3: Implement registry types**

Implementation requirements:

- `ClientSessionState` holds client id, namespace path, subscriptions, lane reference placeholder, principal, connected timestamp, and optional per-client metadata bag.
- `ClientSessionRegistry` is namespace-scoped and deterministic.
- `TopicRegistry` returns frozen arrays for external reads and never exposes mutable sets directly.

- [ ] **Step 4: Re-run tests**

Expected: green.

- [ ] **Step 5: Commit**

Commit: `feat(delivery): add session and topic registries`

## Task 4: Add Spill-To-Disk Store

**Files:**
- Create: `src/internal/delivery/SpillRecord.ts`
- Create: `src/internal/delivery/SpillStore.ts`
- Create: `src/internal/delivery/FileSystemSpillStore.ts`
- Create: `test/unit/internal/delivery/FileSystemSpillStore.test.ts`

- [ ] **Step 1: Write failing tests**

Cover:

- deterministic directory layout: `<root>/<namespace>/<clientId>/<topic>/`
- FIFO persistence and replay order
- manifest or file naming ensures stable ordering across process restarts
- payload and metadata survive round-trip intact
- cleanup removes replayed and explicitly discarded spill files
- dispose/shutdown cleans empty directories but does not remove unrelated content

- [ ] **Step 2: Run targeted test and confirm red**

- [ ] **Step 3: Implement a local filesystem spill store**

Implementation requirements:

- use Node filesystem APIs only
- create directories lazily
- write crash-safe temp files, then rename into place
- store one spill record per file with a sortable name
- expose `append`, `peek`, `shift`, `delete`, `purgeClient`, `purgeNamespace`, and `close`
- never depend on Socket.IO or on process-global temp dirs; root path must be injected

- [ ] **Step 4: Re-run tests**

Expected: green on Windows paths.

- [ ] **Step 5: Commit**

Commit: `feat(delivery): add local filesystem spill store`

## Task 5: Implement ClientLane Core Queue Accounting

**Files:**
- Create: `src/internal/delivery/ClientLane.ts`
- Create: `test/unit/internal/delivery/ClientLane.test.ts`

- [ ] **Step 1: Write failing tests for baseline queue behavior**

Cover:

- queue byte accounting and message-count accounting
- `REJECT_NEW` rejects once limits are exceeded without mutating existing queue
- `DROP_OLDEST` removes oldest entries until the new entry fits
- `maxInFlight` limits delivery handoff concurrency independently of queue size
- dequeue and ack/release paths decrement counts and release `PublishedMessage`
- disconnect marks the lane terminal and rejects new enqueues

- [ ] **Step 2: Run targeted tests and confirm red**

- [ ] **Step 3: Implement `ClientLane`**

Implementation requirements:

- constructor takes immutable namespace policy snapshot plus spill store and optional metrics/event publisher dependencies
- queue holds `LaneEntry` references only
- overflow decisions return `EnqueueResult` instead of mutating hidden state without visibility
- in-flight entries are tracked separately from queued entries
- all release paths must be exception-safe so message refcounts do not leak

- [ ] **Step 4: Re-run tests**

Expected: green.

- [ ] **Step 5: Commit**

Commit: `feat(delivery): add client lane queue accounting`

## Task 6: Implement Coalescing And Snapshot Overflow Policies

**Files:**
- Modify: `src/internal/delivery/ClientLane.ts`
- Modify: `test/unit/internal/delivery/ClientLane.test.ts`

- [ ] **Step 1: Add failing tests**

Cover:

- `COALESCE` replaces the newest queued entry for the same topic and releases the replaced message
- `COALESCE` does not touch unrelated topics
- `SNAPSHOT_ONLY` collapses pending backlog to the newest entry for the topic
- both policies preserve current in-flight entries and only mutate pending queue state
- policies are rejected for `AT_LEAST_ONCE` namespaces because validation already disallows them upstream

- [ ] **Step 2: Run targeted tests and confirm red**

- [ ] **Step 3: Extend `ClientLane` policy handling**

Implementation requirements:

- replacements must preserve queue order for unaffected topics
- byte counters must remain exact after coalescing/snapshot compaction
- dropped entries must be returned in `EnqueueResult` for metrics/events

- [ ] **Step 4: Re-run tests**

Expected: green.

- [ ] **Step 5: Commit**

Commit: `feat(delivery): add coalesce and snapshot-only overflow handling`

## Task 7: Integrate Spill-To-Disk Overflow Behavior

**Files:**
- Modify: `src/internal/delivery/ClientLane.ts`
- Modify: `src/internal/delivery/FileSystemSpillStore.ts`
- Modify: `test/unit/internal/delivery/ClientLane.test.ts`

- [ ] **Step 1: Add failing tests**

Cover:

- `SPILL_TO_DISK` persists overflow entries when memory limits are hit
- replay order is FIFO relative to spill order
- replay occurs only when in-memory pressure drops and never violates `maxInFlight`
- disconnect purges spilled data for the client
- retry exhaustion and explicit rejection cleanup remove abandoned spill files

- [ ] **Step 2: Run targeted tests and confirm red**

- [ ] **Step 3: Implement spill integration**

Implementation requirements:

- `ClientLane` distinguishes memory queue entries from spill-backed placeholders
- replay promotes one spilled record back into normal queue/in-flight flow at a time
- no duplicate delivery when a spill record is replayed
- metrics/events can tell whether overflow spilled or dropped/rejected

- [ ] **Step 4: Re-run tests**

Expected: green.

- [ ] **Step 5: Commit**

Commit: `feat(delivery): integrate spill-to-disk overflow handling`

## Task 8: Add AckTracker

**Files:**
- Create: `src/internal/delivery/AckTracker.ts`
- Create: `test/unit/internal/delivery/AckTracker.test.ts`

- [ ] **Step 1: Write failing tests**

Cover:

- track in-flight reliable messages by message id and client id
- duplicate track on same key throws
- `ack()` resolves and removes entry
- `nackTimeouts(now)` returns expired entries without mutating non-expired ones
- retry attempt increments are explicit and bounded by `maxRetries`
- cleanup on disconnect removes every entry for the client

- [ ] **Step 2: Run targeted tests and confirm red**

- [ ] **Step 3: Implement `AckTracker`**

Implementation requirements:

- do not schedule timers here
- store deadline, current attempt, and source `LaneEntry`
- expose query methods needed by `RetryService` and transport layer only

- [ ] **Step 4: Re-run tests**

Expected: green.

- [ ] **Step 5: Commit**

Commit: `feat(delivery): add ack tracker`

## Task 9: Add RetryService

**Files:**
- Create: `src/internal/delivery/RetryService.ts`
- Modify: `src/internal/delivery/RetryDecision.ts`
- Create: `test/unit/internal/delivery/RetryService.test.ts`

- [ ] **Step 1: Write failing tests**

Cover:

- expired entries retry with fixed delay equal to `ackTimeoutMs`
- retry attempt count increments from 1 through `maxRetries`
- once attempts exceed budget, decision becomes `GIVE_UP`
- service is driven by explicit `tick(now)` calls in unit tests
- no timers or intervals are created in Plan 2

- [ ] **Step 2: Run targeted tests and confirm red**

- [ ] **Step 3: Implement `RetryService`**

Implementation requirements:

- service reads expired entries from `AckTracker`
- returns retry work items to caller instead of performing transport re-send itself
- emits retry and retry-exhausted events through injected publisher interfaces
- records metrics through `ServerMetrics`

- [ ] **Step 4: Re-run tests**

Expected: green.

- [ ] **Step 5: Commit**

Commit: `feat(delivery): add retry service`

## Task 10: Add TopicDispatcher

**Files:**
- Create: `src/internal/delivery/TopicDispatcher.ts`
- Create: `test/unit/internal/delivery/TopicDispatcher.test.ts`

- [ ] **Step 1: Write failing tests**

Cover:

- serialize exactly once per publish call
- fan-out retains the shared `PublishedMessage` for each subscriber lane
- publish to topic only reaches subscribed sessions
- targeted publish reaches one subscribed client only
- publish results aggregate accepted, dropped, rejected, and spilled outcomes
- reliable publish marks entries for ack tracking; best-effort publish does not

- [ ] **Step 2: Run targeted tests and confirm red**

- [ ] **Step 3: Implement `TopicDispatcher`**

Implementation requirements:

- accept a serializer callback injected from transport/server layer later
- operate entirely on `TopicRegistry`, `ClientSessionRegistry`, `ClientLane`, and `AckTracker`
- aggregate per-client outcomes into a deterministic summary object for metrics/event emission

- [ ] **Step 4: Re-run tests**

Expected: green.

- [ ] **Step 5: Commit**

Commit: `feat(delivery): add topic dispatcher`

## Task 11: Add Event Publisher And Real Metrics

**Files:**
- Create: `src/internal/observability/ServerEventPublisher.ts`
- Modify: `src/ServerMetrics.ts`
- Create: `src/internal/observability/PrometheusServerMetrics.ts`
- Create: `test/unit/internal/observability/ServerEventPublisher.test.ts`
- Create: `test/unit/internal/observability/PrometheusServerMetrics.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write failing tests**

Cover:

- event publisher fan-out preserves listener order and isolates listener exceptions
- publisher ignores missing callbacks cleanly
- `PrometheusServerMetrics` increments counters and gauges with namespace/topic labels
- `scrape()` returns Prometheus exposition text
- `NoopServerMetrics` remains unchanged as a safe default

- [ ] **Step 2: Run targeted tests and confirm red**

- [ ] **Step 3: Implement observability pieces**

Implementation requirements:

- keep `ServerMetrics` interface stable
- add `PrometheusServerMetrics` as an exported concrete class
- use a non-global `prom-client` registry so tests stay isolated
- metrics labels must include namespace and topic where applicable

- [ ] **Step 4: Re-run tests**

Expected: green.

- [ ] **Step 5: Commit**

Commit: `feat(observability): add event publisher and prometheus metrics`

## Task 12: Final Delivery-Engine Verification

**Files:**
- Modify: `src/index.ts`
- Verify: `dist/index.d.ts`

- [ ] **Step 1: Export only intended new public symbols**

Public root exports after this plan:

- `PrometheusServerMetrics`

Do not export `internal/delivery/*` or `internal/observability/*` from the package root.

- [ ] **Step 2: Run focused delivery tests**

Run:

- `npx vitest run test/unit/internal/delivery/**/*.test.ts test/unit/internal/observability/**/*.test.ts`

Expected: green.

- [ ] **Step 3: Run full verification**

Run: `npm run typecheck && npm test && npm run test:coverage && npm run build`

Expected:

- all tests pass
- coverage remains above repo thresholds
- build emits clean declarations

- [ ] **Step 4: Spot-check declarations**

Confirm `dist/index.d.ts` includes `PrometheusServerMetrics` and does not expose delivery internals.

- [ ] **Step 5: Commit**

Commit: `chore: verify delivery engine plan completion`

- [ ] **Step 6: Report handoff state**

State to the user that Plan 2 is complete and that Plan 3 may now begin because the delivery core is fully unit-tested and transport-free.

## Acceptance Checklist

- Every overflow action works end-to-end in unit tests.
- `SPILL_TO_DISK` survives filesystem round-trip and cleans up correctly.
- `TopicDispatcher` serializes once and fans out by retained reference.
- `AckTracker` and `RetryService` cover the full `AT_LEAST_ONCE` retry lifecycle.
- Real Prometheus metrics are available through `PrometheusServerMetrics`.
- No Socket.IO dependency exists in any `src/internal/delivery/*` file.
