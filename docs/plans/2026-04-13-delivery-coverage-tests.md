# Delivery Coverage Test Additions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add targeted delivery-layer behavioral tests to improve runtime coverage in `ClientLane`, `AckTracker`, and `TopicDispatcher`.

**Architecture:** Extend the existing unit test suites with focused edge-case coverage. Keep changes test-only unless a real runtime bug is exposed by the new tests.

**Tech Stack:** TypeScript, Vitest, existing delivery test helpers

---

### Task 1: Expand `ClientLane` edge-case coverage

**Files:**
- Modify: `test/unit/internal/delivery/ClientLane.test.ts`

**Step 1: Add tests**

Add tests for:

- `SPILL_TO_DISK` without a spill queue rejecting overflow entries
- no-polling queue behavior at capacity
- coalescing not replacing awaiting entries
- `removeByMessageId()` returning `undefined` for missing ids
- pending work detection when spilled entries remain

**Step 2: Run focused test**

Run: `npm test -- ClientLane`

Expected: PASS

### Task 2: Expand `AckTracker` branch coverage

**Files:**
- Modify: `test/unit/internal/delivery/AckTracker.test.ts`

**Step 1: Add tests**

Add tests for:

- stale expiration handles being ignored after re-registration
- acknowledged handles being ignored during expiration scan
- namespace/topic-specific removal preserving unrelated pending entries
- multiple expirations returned in deadline order

**Step 2: Run focused test**

Run: `npm test -- AckTracker`

Expected: PASS

### Task 3: Expand `TopicDispatcher` branch coverage

**Files:**
- Modify: `test/unit/internal/delivery/TopicDispatcher.test.ts`

**Step 1: Add tests**

Add tests for:

- best-effort send failure continuing drain
- at-least-once send failure removing the failed entry
- unknown topic errors from `publish()`
- disconnect/unsubscribe no-op branches
- drain rescheduling when pending work remains

**Step 2: Run focused test**

Run: `npm test -- TopicDispatcher`

Expected: PASS

### Task 4: Verify repository state

**Files:**
- Modify: none unless follow-up test fixes are needed

**Step 1: Run verification**

Run: `npm run lint`

Expected: PASS

Run: `npm run typecheck`

Expected: PASS

Run: `npm run test:coverage`

Expected: PASS with improved delivery-file coverage
