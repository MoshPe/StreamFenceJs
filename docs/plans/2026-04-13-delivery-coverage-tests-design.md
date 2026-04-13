# Delivery Coverage Test Additions Design

## Goal

Improve coverage in the three remaining weak delivery-runtime files by adding meaningful behavioral tests only:

- `src/internal/delivery/ClientLane.ts`
- `src/internal/delivery/AckTracker.ts`
- `src/internal/delivery/TopicDispatcher.ts`

## Current State

The repository already passes the global threshold, but these delivery files still carry the largest runtime gaps:

- `ClientLane.ts`: `72.09%` lines, `71.23%` branches
- `AckTracker.ts`: `87.23%` lines, `79.54%` branches
- `TopicDispatcher.ts`: `85.82%` lines, `73.33%` branches

Existing tests mostly cover happy paths. The remaining misses are edge-branch behavior around overflow handling, stale retry state, send failures, and lifecycle no-op paths.

## Recommended Approach

Add small, targeted unit tests in the existing delivery suites. Avoid synthetic coverage padding and avoid production changes unless a test reveals a real bug.

This is the highest-leverage option because:

- the files already have good test scaffolding
- the remaining gaps are branch-heavy and easy to isolate
- unit tests are faster and more deterministic than broader integration coverage

## Test Targets

### `ClientLane`

Add coverage for:

- `SPILL_TO_DISK` overflow without a spill queue falling back to rejection
- queue-limit behavior when polling is disabled
- coalescing replacing only queued entries, not awaiting entries
- `removeByMessageId()` returning `undefined` for missing entries
- pending-send behavior when memory is empty but spilled entries remain

### `AckTracker`

Add coverage for:

- stale expiration handles after re-registering the same `(client, namespace, topic, messageId)`
- expired handles already acknowledged before collection
- `removeClientTopic()` preserving entries outside the exact namespace/topic pair
- multi-entry expiration ordering in a single scan

### `TopicDispatcher`

Add coverage for:

- best-effort send failures being swallowed while later entries continue draining
- at-least-once send failures causing cleanup/removal
- unknown topic policy errors from `publish()`
- unsubscribe and disconnect no-op branches for missing or mismatched sessions
- drain rescheduling when work remains after the current drain finishes

## Success Criteria

- all added tests validate observable behavior, not private implementation details
- coverage improves materially in the three target files
- repository verification remains green:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test:coverage`
