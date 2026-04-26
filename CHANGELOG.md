# Changelog

## 1.1.0 (2026-04-26)

### Features
- **`SPILL_TO_DISK` for `AT_LEAST_ONCE` namespaces**: Excess messages are written to disk and transparently replayed as the client acks and drains its backlog — zero message loss under heavy burst load. Previously `AT_LEAST_ONCE` required `REJECT_NEW`; `SPILL_TO_DISK` is now also accepted.

### Bug Fixes
- **Wire format**: `AT_LEAST_ONCE` messages now correctly deliver `(payload, metadata)` as two socket event arguments. Previously only `payload` was sent, so clients could never extract `messageId` and ack.
- **Competing retry interval**: `TopicDispatcher` was calling `retryService.start()` in its constructor, creating a 50 ms interval that consumed expired `AckTracker` entries and discarded the retry decisions before `processRetries` could act on them. Retries and exhaustions were silently swallowed.
- **Exhaustion drain**: After a message exhausted its retries and was removed from the lane, no drain was triggered, leaving any spilled messages stranded on disk indefinitely.
- **Infinite drain loop**: The `drainTopic` finally-block reschedule was not gated on `inFlightCount < maxInFlight`, causing an infinite microtask loop when a message was in-flight and spill was pending simultaneously.

### Tests
- Unit tests for `AT_LEAST_ONCE` wire format (metadata as second arg) and `BEST_EFFORT` no-metadata path
- Unit test for spill-then-ack delivery flow
- Integration tests: end-to-end spill delivery, FIFO ordering across spilled messages, withheld delivery until retry exhaustion frees the in-flight slot

### Examples
- Added `examples/spill-to-disk/` — server burst-publishes 20 orders, slow client acks each after 300 ms, demonstrating zero-loss delivery via disk spill

## 1.0.3 (2026-04-22)

### Breaking Changes
- **`managementPort` removed**: The built-in management HTTP server (`/health`, `/metrics`) is gone. Mount metrics on your own HTTP server instead (see below).
- **`prom-client` is now a peer dependency** (`>=14`, optional): Install it yourself — `npm install prom-client`. This avoids duplicate registry issues when your app already uses prom-client.
- **`scrape()` removed from `ServerMetrics` interface**: Use `registry.metrics()` from your prom-client Registry instead.
- **`managementPort` removed from lifecycle events**: `ServerStartingEvent`, `ServerStartedEvent`, `ServerStoppingEvent`, `ServerStoppedEvent` no longer carry a `managementPort` field.

### Migration

```typescript
// Before
const server = new StreamFenceServerBuilder()
  .metrics(new PromServerMetrics())
  .managementPort(9090)
  .buildServer();

// After
import { register } from 'prom-client';

const server = new StreamFenceServerBuilder()
  .metrics(new PromServerMetrics(register))
  .buildServer();

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

## 1.0.2 (2026-04-22)

### Performance
- **Non-blocking disk spill**: `DiskSpillQueue` now uses `fs.promises` for all file operations — spill writes are fire-and-forget async, preventing event loop blocking during overflow. `recover()` and `clear()` are fully async with proper back-pressure via `Promise.allSettled` before reads.

### Community
- Added `CONTRIBUTING.md` with setup and workflow guide
- Added `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1)
- Expanded npm keywords for better discoverability

## 1.0.1 (2026-04-14)

### Features
- **SPILL_TO_DISK overflow**: Messages spill to disk when in-memory queues are full, with transparent recovery during drain
- DiskSpillQueue with atomic file writes and FIFO ordering
- Per-client per-topic spill directories under configurable `spillRootPath`
- `streamfence_messages_spilled_total` Prometheus counter
- Automatic spill file cleanup on client disconnect

### Tests
- SpilledEntry serialization round-trip tests
- DiskSpillQueue unit tests (spill, recover, clear, pre-existing files)
- ClientLane SPILL_TO_DISK integration tests
- Spill-to-disk end-to-end integration test with real Socket.IO server
- Multi-namespace overflow policy tests (DROP_OLDEST, REJECT_NEW, SNAPSHOT_ONLY)
- Queue byte-limit rejection test

### Maintenance
- Upgraded vitest from 2.x to 4.1.4
- Upgraded @vitest/coverage-v8 to 4.1.4
- Fixed mock typing for vitest 4 `vi.fn()` changes

## 1.0.0 (2026-04-13)

### Features
- Socket.IO delivery control with BEST_EFFORT and AT_LEAST_ONCE modes
- Five overflow actions: DROP_OLDEST, REJECT_NEW, COALESCE, SNAPSHOT_ONLY, SPILL_TO_DISK
- Per-client per-topic backpressure with configurable queue limits
- Retry with configurable max retries and ack timeout
- YAML/JSON config file loading via `fromYaml()` / `fromJson()`
- Prometheus metrics via `PromServerMetrics`
- Management HTTP server with `/health` and `/metrics` endpoints
- TLS support
- Token-based authentication
- Full TypeScript types with ESM and CJS dual-format distribution
