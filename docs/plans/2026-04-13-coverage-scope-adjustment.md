# Coverage Scope Adjustment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Exclude pure type/interface files from Vitest coverage and measure the updated threshold result.

**Architecture:** Make the smallest possible change in `vitest.config.ts` by extending the coverage exclude list with the four pure type/interface files already identified. Then rerun coverage and inspect the new totals before deciding whether test work is still required.

**Tech Stack:** Vitest config, V8 coverage, Node.js test scripts.

---

### Task 1: Exclude Pure Type Files

**Files:**
- Modify: `vitest.config.ts`

**Step 1: Extend coverage excludes**

Add the four pure type/interface files to `coverage.exclude`.

### Task 2: Re-run Coverage

**Files:**
- None

**Step 1: Run coverage**

Run: `npm run test:coverage`

**Step 2: Inspect totals**

Record:
- lines
- statements
- branches
- functions

### Task 3: Report Result

**Files:**
- None

**Step 1: Summarize**

Report whether thresholds now pass or which real runtime files still need tests.
