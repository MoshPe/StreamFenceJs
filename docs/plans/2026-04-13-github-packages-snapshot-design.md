# GitHub Packages Snapshot Publishing Design

## Goal

Publish snapshot builds to GitHub Packages without changing the stable public npm package name or release flow.

## Current State

The repository currently publishes stable releases from GitHub Releases to npm as:

- `streamfence-js`

It does not publish snapshot builds to GitHub Packages.

GitHub's npm registry requires scoped package names, so the unscoped package name cannot be reused there.

## Recommended Approach

Add a separate snapshot workflow that publishes a GitHub Packages-only package with the scoped name:

- `@moshpe/streamfence-js`

This keeps channels clean:

- stable releases -> npm
- snapshot builds -> GitHub Packages

## Snapshot Policy

- trigger from verified `main` builds
- publish snapshots as:
  - `@moshpe/streamfence-js`
  - version: `1.0.1-snapshot.<run-number>` for current `1.0.0`

The snapshot version is derived from the repository version by incrementing the patch and appending a snapshot suffix.

## Workflow Behavior

The snapshot workflow should:

1. run on `push` to `main`
2. optionally support `workflow_dispatch`
3. run repository verification:
   - `npm ci`
   - `npm run lint`
   - `npm run typecheck`
   - `npm test`
   - `npm run build`
   - `npm run test:package`
4. create a temporary publish directory
5. generate a publish-only `package.json` with:
   - `name: @moshpe/streamfence-js`
   - `version: <next-patch>-snapshot.<run-number>`
6. copy the package payload:
   - `dist/`
   - `README.md`
   - `LICENSE`
7. publish to `https://npm.pkg.github.com`

## Authentication and Permissions

The workflow should use:

- `permissions: packages: write`
- `permissions: contents: read`
- `GITHUB_TOKEN` for registry auth

## Success Criteria

- stable npm release automation remains unchanged
- snapshot builds publish to GitHub Packages successfully
- snapshots use a scoped package name and valid semver prerelease version
- no permanent rename or mutation of the repository package manifest
