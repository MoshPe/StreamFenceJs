# README Full Badge Row Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update the README badge row to include the full Java-style badge set using JavaScript repository equivalents.

**Architecture:** This is a README-only change. Replace the current badge row with a fuller set of status badges that point at the JS repository and keep the rest of the README unchanged.

**Tech Stack:** Markdown, GitHub badge endpoints, Shields.io.

---

### Task 1: Update Badge Row

**Files:**
- Modify: `README.md`

**Step 1: Edit the badge row**

Add badges for:
- `CI`
- `CodeQL`
- `Codecov`
- `npm`
- `GitHub Release`
- `Node >= 20`
- `License`

**Step 2: Verify links and image URLs visually**

Confirm the badge URLs point to:
- the StreamFenceJs GitHub repository
- npm package page for `streamfence-js`
- Codecov project page for `MoshPe/StreamFenceJs`

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
- `README.md`
- design/plan docs

**Step 1: Commit**

```bash
git commit -m "docs: expand README badge row"
```

**Step 2: Push**

Push the branch to origin.
