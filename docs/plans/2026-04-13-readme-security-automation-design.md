# README Security Automation Design

**Date:** 2026-04-13

## Goal

Add truthful repository automation and status signaling to StreamFenceJs by:
- adding a CodeQL workflow
- adding Dependabot configuration
- updating the README badge row to include only live, externally visible status badges

## Scope

In scope:
- `.github/workflows/codeql.yml`
- `.github/dependabot.yml`
- `README.md` badge row update

Out of scope:
- Codecov integration and badge
- npm badge
- release badge before a real GitHub release exists
- secret scanning badge or README mention

## Decisions

### Badge policy

The README should only show badges that are true now. The badge row should contain:
- CI
- CodeQL
- Node >= 20
- License

Dependabot will be enabled without a badge.

Secret scanning will be treated as a GitHub repository setting, not a README badge.

### CodeQL approach

Use a standard GitHub CodeQL workflow for JavaScript/TypeScript:
- trigger on push
- trigger on pull requests to `main` and `master`
- allow manual dispatch
- use GitHub-hosted analysis with the normal build path for this repo

### Dependabot approach

Use `.github/dependabot.yml` with:
- weekly `npm` updates for the repository root
- weekly GitHub Actions updates
- a small open PR cap
- grouped updates to reduce PR noise

## Verification

After implementation, verify with:
- `npm run lint`
- `npm run typecheck`
- `npm test`

## Notes

The CodeQL badge may not render meaningful status until GitHub has run the workflow on the branch or default branch.
