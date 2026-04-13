# Release Automation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a release workflow that publishes published GitHub Releases to npm and uploads the package tarball to the GitHub Release, with the first real version set to `1.0.0`.

**Architecture:** Introduce one dedicated release workflow driven by GitHub Releases. The workflow reuses the repository’s existing verification commands, computes the npm dist-tag from release metadata, publishes to npm, and uploads the `npm pack` artifact back to GitHub.

**Tech Stack:** GitHub Actions, npm, Node.js 20

---

### Task 1: Add the release workflow

**Files:**
- Create: `.github/workflows/release.yml`

**Step 1: Add workflow**

Create a workflow that:

- triggers on `release.published`
- optionally supports `workflow_dispatch`
- checks out the repo
- sets up Node 20 with npm registry auth
- installs dependencies
- runs:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
  - `npm run build`
  - `npm run test:package`
- runs `npm pack`
- publishes with:
  - `latest` when not prerelease
  - `next` when prerelease
- uploads the generated `.tgz` to the GitHub Release

**Step 2: Run focused validation**

Run: verify workflow YAML structure locally by inspection and with existing repo commands.

Expected: no syntax or command mismatches.

### Task 2: Bump the package version to `1.0.0`

**Files:**
- Modify: `package.json`

**Step 1: Update version**

Change the package version from `0.1.0-alpha.0` to `1.0.0`.

**Step 2: Ensure workflow policy matches**

Confirm stable release handling maps to npm `latest`.

### Task 3: Verify repository state

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

### Task 4: Create the `1.0.0` release when prerequisites are present

**Files:**
- Modify: none

**Step 1: Confirm prerequisite**

Ensure `NPM_TOKEN` exists in GitHub secrets before creating the real release.

**Step 2: Create GitHub Release**

Create a published `1.0.0` GitHub Release.

Expected:

- release workflow runs
- npm publish uses the `latest` tag
- package tarball appears on the GitHub Release
