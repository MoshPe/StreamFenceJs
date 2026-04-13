# Coverage Scope Adjustment Design

**Date:** 2026-04-13

## Goal

Adjust coverage scope only for pure type/interface files that should not count toward runtime coverage thresholds, then rerun coverage to see whether the repository clears the existing Vitest thresholds without adding tests.

## Scope

In scope:
- `vitest.config.ts`
- rerun `npm run test:coverage`

Out of scope:
- adding new tests in this step
- changing thresholds

## Decision

Exclude only these pure type/interface files from coverage:
- `src/internal/config/RawNamespaceConfig.ts`
- `src/internal/config/RawServerConfig.ts`
- `src/internal/config/RawServerEntry.ts`
- `src/internal/transport/TransportClient.ts`

After that, rerun coverage and re-evaluate the remaining gap.
