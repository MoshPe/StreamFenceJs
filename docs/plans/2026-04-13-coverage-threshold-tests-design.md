# Coverage Threshold Test Additions Design

## Goal

Raise the real runtime coverage to meet the existing Vitest global threshold after excluding only the pure type/interface files that should not count toward runtime coverage.

## Current State

The coverage-scope cleanup removed obvious non-runtime files from measurement, but the repository still fails the global threshold:

- Lines: `88.63%`
- Statements: `88.63%`
- Required: `90%`

The remaining gap is concentrated in runtime files that either have no direct tests or still leave important unhappy-path branches uncovered.

## Recommended Approach

Add targeted unit tests to the highest-leverage runtime branches instead of changing coverage scope further.

Priority order:

1. `NamespaceHandler`
2. `ManagementHttpServer`
3. `TopicDispatcher`
4. `StreamFenceServer`

This is the most efficient path because these files contain branch-heavy lifecycle and error-handling paths that can be exercised with small, deterministic tests.

## Test Targets

### `NamespaceHandler`

Add tests for:

- idempotent `start()` and `stop()`
- invalid `subscribe`, `unsubscribe`, `publish`, and `ack` payloads
- unknown topics being ignored
- disconnect cleanup unregistering handlers and notifying the dispatcher

### `ManagementHttpServer`

Add tests for:

- unknown route returning `404`
- provider failure returning `500`
- repeated `start()` and `stop()` behaving safely

### `TopicDispatcher`

Add tests for:

- `publishTo()` no-op branches when the client session is missing, in another namespace, or unsubscribed
- retry processing branches when the session or lane is missing
- retry exhaustion removing pending entries
- acknowledge branches when the session or lane is missing

### `StreamFenceServer`

Add tests for:

- listener lifecycle events on start/stop
- disabled management port path
- custom retry processor replacement while running
- spill-to-disk path sanitization through spill-enabled lane creation

## Success Criteria

- `npm run test:coverage` passes the repository threshold without excluding any additional runtime files
- all existing tests remain green
- new tests target real behavior rather than snapshotting internals
