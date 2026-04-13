# Coverage Threshold Test Additions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add focused unit tests that raise runtime coverage above the existing Vitest global threshold.

**Architecture:** Extend the current unit test suites around transport, observability, dispatcher, and server lifecycle code. Prefer small deterministic tests that exercise missed branches directly instead of broad integration-style coverage padding.

**Tech Stack:** TypeScript, Vitest, Socket.IO test doubles, Node HTTP/fetch

---

### Task 1: Add transport and management branch coverage

**Files:**
- Create: `test/unit/internal/transport/NamespaceHandler.test.ts`
- Modify: `test/unit/internal/observability/ManagementHttpServer.test.ts`

**Step 1: Write failing tests**

Add tests covering:

- `NamespaceHandler.start()` / `stop()` idempotency
- invalid and unknown-topic socket event payloads being ignored
- disconnect cleanup calling `dispatcher.onClientDisconnected`
- `ManagementHttpServer` returning `404`
- `ManagementHttpServer` returning `500` when a provider throws
- repeated `start()` / `stop()` no-op safety

**Step 2: Run focused tests**

Run: `npm test -- NamespaceHandler ManagementHttpServer`

Expected: new tests pass without implementation changes because this task only adds coverage.

**Step 3: Commit**

```bash
git add test/unit/internal/transport/NamespaceHandler.test.ts test/unit/internal/observability/ManagementHttpServer.test.ts
git commit -m "test: add transport and management branch coverage"
```

### Task 2: Add dispatcher branch coverage

**Files:**
- Modify: `test/unit/internal/delivery/TopicDispatcher.test.ts`

**Step 1: Write failing tests**

Add tests covering:

- `publishTo()` when the session is missing
- `publishTo()` when the namespace does not match
- `publishTo()` when the client is not subscribed
- `acknowledge()` when the session is missing
- `acknowledge()` when the lane is missing
- `processRetries()` when retry targets no longer have a session or lane
- retry exhaustion removing the pending entry

**Step 2: Run focused tests**

Run: `npm test -- TopicDispatcher`

Expected: all tests pass and increase branch coverage materially.

**Step 3: Commit**

```bash
git add test/unit/internal/delivery/TopicDispatcher.test.ts
git commit -m "test: cover dispatcher edge cases"
```

### Task 3: Add server lifecycle branch coverage

**Files:**
- Modify: `test/unit/StreamFenceServer.test.ts`

**Step 1: Write failing tests**

Add tests covering:

- lifecycle listener callbacks on start and stop
- disabled management port path
- replacing the retry processor while running
- spill path sanitization via a spill-enabled topic configuration

**Step 2: Run focused tests**

Run: `npm test -- StreamFenceServer`

Expected: tests pass and lift the remaining server-file coverage gaps.

**Step 3: Commit**

```bash
git add test/unit/StreamFenceServer.test.ts
git commit -m "test: add server lifecycle coverage"
```

### Task 4: Verify threshold

**Files:**
- Modify: none unless the threshold is still missed

**Step 1: Run full verification**

Run: `npm run lint`

Expected: PASS

Run: `npm run typecheck`

Expected: PASS

Run: `npm run test:coverage`

Expected: PASS with lines/statements at or above `90%`

**Step 2: If needed, add one more narrow test**

If coverage is still below threshold, inspect the updated report and add the smallest possible test to the next highest-leverage uncovered runtime branch.

**Step 3: Commit**

```bash
git add test vitest.config.ts
git commit -m "test: satisfy coverage threshold"
```
