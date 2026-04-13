# GitHub Packages Snapshot Publishing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a GitHub Actions workflow that publishes snapshot builds to GitHub Packages as `@moshpe/streamfence-js` without changing the stable npm package name.

**Architecture:** Introduce a dedicated snapshot workflow for `main`. The workflow reuses the repository verification gates, builds the package, stages a temporary publish directory, rewrites package metadata only in that staging area, and publishes to GitHub Packages using `GITHUB_TOKEN`.

**Tech Stack:** GitHub Actions, Node.js 20, npm, GitHub Packages npm registry

---

### Task 1: Add the snapshot publishing workflow

**Files:**
- Create: `.github/workflows/snapshot-release.yml`

**Step 1: Add workflow**

Create a workflow that:

- triggers on pushes to `main`
- optionally supports `workflow_dispatch`
- uses `packages: write` permission
- installs dependencies
- runs:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
  - `npm run build`
  - `npm run test:package`
- creates a temporary publish directory
- writes a publish-only `package.json` with scoped snapshot metadata
- publishes to `https://npm.pkg.github.com`

**Step 2: Ensure naming/version policy**

Generate snapshot metadata at runtime:

- name: `@moshpe/streamfence-js`
- version: next patch + `-snapshot.<run-number>`

### Task 2: Verify repository state

**Files:**
- Modify: none unless follow-up fixes are needed

**Step 1: Run verification**

Run: `npm run lint`

Expected: PASS

Run: `npm run typecheck`

Expected: PASS

Run: `npm test`

Expected: PASS

Run: `npm run test:package`

Expected: PASS
