# CI JUnit Reporting Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Generate a Vitest JUnit XML file in GitHub Actions without changing local test scripts.

**Architecture:** Modify the existing CI workflow only. Keep `package.json` unchanged, run Vitest directly with the JUnit reporter in GitHub Actions, and upload the XML output as a job artifact.

**Tech Stack:** GitHub Actions YAML, Vitest CLI JUnit reporter.

---

### Task 1: Update CI Test Step

**Files:**
- Modify: `.github/workflows/ci.yml`

**Step 1: Replace the plain test command**

Change the `Test` step in the matrix job to:
- run `npx vitest run --reporter=default --reporter=junit --outputFile=test-report.junit.xml`

**Step 2: Upload the XML report**

Add an artifact upload step after the test step:
- use `actions/upload-artifact`
- artifact name should include the Node version
- upload `test-report.junit.xml`

### Task 2: Verify Repository State

**Files:**
- None

**Step 1: Run lint**

Run: `npm run lint`

**Step 2: Run typecheck**

Run: `npm run typecheck`

**Step 3: Run tests**

Run: `npm test`

### Task 3: Commit and Push

**Files:**
- `.github/workflows/ci.yml`
- `docs/plans/2026-04-13-ci-junit-reporting.md`

**Step 1: Commit**

```bash
git commit -m "ci: add junit test reporting"
```

**Step 2: Push**

Push the branch to origin.
