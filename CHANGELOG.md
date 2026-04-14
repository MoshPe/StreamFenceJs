# Changelog

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
