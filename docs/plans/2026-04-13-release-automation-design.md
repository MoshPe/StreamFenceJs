# Release Automation Design

## Goal

Add GitHub Actions release automation that publishes from GitHub Releases to both:

- GitHub Releases, with the npm package tarball attached as an asset
- npm, using `latest` for stable releases and `next` for prereleases

The first automated real release should be `1.0.0`.

## Current State

The repository already has:

- CI verification
- CodeQL
- Dependabot
- package smoke checks
- JUnit test reporting in CI

It does not yet have a dedicated release workflow or npm publish automation.

## Recommended Approach

Add a single workflow triggered by the `release.published` event.

This keeps GitHub Releases as the source of truth and avoids separate tag-only automation. The workflow should:

1. check out the code
2. install dependencies
3. verify the package
4. build the distribution
5. create an npm tarball with `npm pack`
6. publish to npm using the correct dist-tag
7. upload the tarball to the GitHub Release

## Release Policy

- stable GitHub Release -> publish to npm with `latest`
- prerelease GitHub Release -> publish to npm with `next`
- first real release version -> `1.0.0`

## Workflow Requirements

### Trigger

- `release`
  - `types: [published]`
- optional `workflow_dispatch` for manual recovery or testing

### Verification

The release workflow should fail before publish if any verification step fails:

- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run test:package`

### Publish Behavior

- use Node 20
- authenticate with npm using `NPM_TOKEN`
- publish public package with `npm publish --access public --tag <latest|next>`
- compute the dist-tag from `github.event.release.prerelease`

### GitHub Release Asset

- run `npm pack`
- upload the resulting `.tgz` to the current GitHub Release

## Required Repo/Settings Preconditions

- `package.json` version must be bumped to `1.0.0`
- `NPM_TOKEN` must exist in repository or environment secrets
- the GitHub Actions token needs `contents: write` to upload release assets

## Success Criteria

- creating a published GitHub Release can drive a full npm publish
- stable releases publish to `latest`
- prereleases publish to `next`
- the release tarball is attached to the GitHub Release
- repository verification stays green after the workflow and version changes
