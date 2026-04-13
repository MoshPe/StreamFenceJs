# README Security Automation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add CodeQL, Dependabot, and a truthful README badge row that matches the repo's live automation state.

**Architecture:** Add one new GitHub Actions workflow for CodeQL, one Dependabot config file, and update the README header badge row to mirror the Java repo style without claiming features that are not active. Keep the implementation minimal and grounded in commands that already pass locally.

**Tech Stack:** GitHub Actions YAML, Dependabot config, Markdown, Node.js repository scripts.

---

### Task 1: Add CodeQL Workflow

**Files:**
- Create: `.github/workflows/codeql.yml`

**Step 1: Write the workflow file**

Create a GitHub Actions workflow that:
- is named `CodeQL`
- runs on push
- runs on PRs to `main` and `master`
- supports `workflow_dispatch`
- grants `actions: read`, `contents: read`, `security-events: write`
- analyzes JavaScript/TypeScript with `github/codeql-action`

**Step 2: Run YAML sanity review**

Check the workflow visually for:
- correct indentation
- valid permissions block
- correct language matrix

**Step 3: Commit-ready verification**

No local execution is required beyond repository verification in Task 4.

### Task 2: Add Dependabot Configuration

**Files:**
- Create: `.github/dependabot.yml`

**Step 1: Write Dependabot config**

Create config with:
- `version: 2`
- weekly `npm` updates for `/`
- weekly GitHub Actions updates for `/`
- small PR limit
- grouped updates to reduce noise

**Step 2: Run config sanity review**

Check the file visually for:
- valid YAML structure
- correct ecosystems
- correct directories

### Task 3: Update README Badge Row

**Files:**
- Modify: `README.md`

**Step 1: Update badge row**

Replace the current two-badge row with a row containing:
- CI badge
- CodeQL badge
- Node >= 20 badge
- License badge

Use GitHub badge URLs that point to `main`.

**Step 2: Keep header scope narrow**

Do not add:
- Dependabot badge
- secret scanning badge
- Codecov badge
- npm badge
- release badge

### Task 4: Verify Repository State

**Files:**
- None

**Step 1: Run lint**

Run: `npm run lint`

**Step 2: Run typecheck**

Run: `npm run typecheck`

**Step 3: Run tests**

Run: `npm test`

**Step 4: Review git diff**

Run: `git diff --stat`

### Task 5: Commit and Push

**Files:**
- All files from Tasks 1-3

**Step 1: Commit**

Use a commit message like:

```bash
git commit -m "chore: add codeql automation and README badges"
```

**Step 2: Push**

Push the branch to origin.
