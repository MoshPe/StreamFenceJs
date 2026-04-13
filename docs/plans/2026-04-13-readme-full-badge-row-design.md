# README Full Badge Row Design

**Date:** 2026-04-13

## Goal

Expand the StreamFenceJs README header badge row so it mirrors the Java repository style more closely, even if some badges are temporarily unresolved until later repository setup work is finished.

## Scope

In scope:
- update `README.md` badge row only

Out of scope:
- Codecov upload setup
- npm publishing
- GitHub release creation
- secret scanning changes
- Dependabot badge

## Decisions

- Add these badges now: `CI`, `CodeQL`, `Codecov`, `npm`, `GitHub Release`, `Node >= 20`, `License`
- Keep `Dependabot` unbadged
- Keep `secret scanning` unbadged
- Accept that `Codecov`, `npm`, and `GitHub Release` may be blank/red until their backing systems are live

## Verification

After the README edit, verify with:
- `npm run lint`
- `npm run typecheck`
- `npm test`
