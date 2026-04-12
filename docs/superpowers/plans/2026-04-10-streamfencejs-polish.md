# StreamFenceJs Polish And Publish Readiness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Finish v1 polish for `streamfence-js`: file-based config loading, builder parity from config, runnable examples, a complete README, and package validation for publishing and plain-JS consumption.

**Architecture:** This plan does not invent new delivery or transport behavior. It layers config loading and documentation on top of the already-working server implementation, then verifies the emitted package from a consumer point of view. The builder API remains the primary programmatic path; config loading maps into the same public spec objects.

**Tech Stack:** TypeScript 5.x, Vitest 2, YAML parser package, Node filesystem/path APIs, existing build pipeline.

**Baseline:** Start only after Plan 3 is complete and green.

---

## Task 1: Add Config-Loading Dependencies And Raw Config Shapes

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/internal/config/ServerConfig.ts`
- Create: `src/internal/config/NamespaceConfig.ts`
- Create: `src/internal/config/TopicPolicyDefinition.ts`
- Create: `src/internal/config/TopicPolicy.ts`
- Create: `test/unit/internal/config/ConfigShapes.test.ts`

- [ ] **Step 1: Add YAML parsing dependency**

Add runtime dependency: `yaml`

- [ ] **Step 2: Install and lock**

Run: `npm install`

- [ ] **Step 3: Write failing tests for raw config shapes**

Cover:

- raw server configs support multiple named servers in one file
- namespace raw config includes all public namespace knobs from Plans 1 and 3
- topic policy definitions can override namespace defaults where the public model allows it

- [ ] **Step 4: Run targeted test and confirm red**

- [ ] **Step 5: Implement raw config interfaces**

Keep them internal and serialization-friendly only; no behavior here.

- [ ] **Step 6: Re-run tests and commit**

Commit: `feat(config): add raw config shapes and yaml dependency`

## Task 2: Add Config Loader

**Files:**
- Create: `src/internal/config/ServerConfigLoader.ts`
- Create: `test/unit/internal/config/ServerConfigLoader.test.ts`
- Create: `test/fixtures/config/streamfence.valid.yaml`
- Create: `test/fixtures/config/streamfence.valid.json`
- Create: `test/fixtures/config/streamfence.invalid.yaml`

- [ ] **Step 1: Write failing tests**

Cover:

- load YAML file into raw config
- load JSON file into raw config
- unsupported extension rejection
- malformed file surfaces readable error message with path
- named server selection is deferred to the mapper layer, not the loader

- [ ] **Step 2: Run targeted tests and confirm red**

- [ ] **Step 3: Implement loader**

Implementation requirements:

- detect format from extension
- use UTF-8 reads
- return raw config plus source-path metadata if helpful for later errors

- [ ] **Step 4: Re-run tests**

Expected: green.

- [ ] **Step 5: Commit**

Commit: `feat(config): add yaml and json config loader`

## Task 3: Add Raw-Config To Public-Spec Mapping

**Files:**
- Create: `src/internal/config/SpecMapper.ts`
- Create: `test/unit/internal/config/SpecMapper.test.ts`

- [ ] **Step 1: Write failing tests**

Cover:

- named server selection by id
- raw config maps to `StreamFenceServerSpec`, `NamespaceSpec`, `TlsConfig`, `EngineIoTransportMode`, and `InboundAckPolicy`
- duplicate namespace paths are rejected
- invalid enum strings surface readable errors
- missing named server surfaces readable error

- [ ] **Step 2: Run targeted tests and confirm red**

- [ ] **Step 3: Implement mapper**

Implementation requirements:

- mapping is the only place that converts string config into strongly typed public objects
- reuse existing `create()` and builder validation paths instead of duplicating validation logic
- preserve defaults consistently with the builder API

- [ ] **Step 4: Re-run tests**

Expected: green.

- [ ] **Step 5: Commit**

Commit: `feat(config): add raw config to public spec mapper`

## Task 4: Add Builder Parity From Config

**Files:**
- Modify: `src/StreamFenceServerBuilder.ts`
- Modify: `src/StreamFenceServerSpec.ts`
- Create: `test/unit/StreamFenceServerBuilder.fromConfig.test.ts`

- [ ] **Step 1: Write failing tests**

Cover:

- `fromYaml(path, { server })`
- `fromJson(path, { server })`
- builder can be further customized after loading config
- builder-loaded values match manually constructed specs

- [ ] **Step 2: Run targeted tests and confirm red**

- [ ] **Step 3: Implement builder/config parity**

Implementation requirements:

- config loading returns into the same builder/spec model
- explicit builder calls after `fromYaml` or `fromJson` override loaded values deterministically

- [ ] **Step 4: Re-run tests**

Expected: green.

- [ ] **Step 5: Commit**

Commit: `feat(api): add builder parity from yaml and json config`

## Task 5: Add Runnable Example Apps

**Files:**
- Create: `examples/mixed-workload/server.ts`
- Create: `examples/mixed-workload/clients/feed-client.ts`
- Create: `examples/mixed-workload/clients/control-client.ts`
- Create: `examples/single-server/server.ts`
- Create: `examples/README.md`
- Modify: `package.json`

- [ ] **Step 1: Write smoke tests or scripted checks first**

Add a small verification approach, either:

- `test/integration/examples-smoke.test.ts`, or
- `npm run examples:check`

Cover:

- mixed-workload example imports compile
- single-server example imports compile

- [ ] **Step 2: Run the new smoke check and confirm red**

- [ ] **Step 3: Implement examples**

Requirements:

- mixed-workload example uses two `StreamFenceServer` instances and documents why
- single-server example stays intentionally small
- examples use only public exports from package root

- [ ] **Step 4: Re-run smoke checks**

Expected: green.

- [ ] **Step 5: Commit**

Commit: `docs(examples): add runnable mixed-workload and single-server examples`

## Task 6: Expand README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the stub README with a full package README**

Required sections:

- what StreamFenceJs is
- when to use one server vs two
- install
- quick start
- public API overview
- delivery semantics
- overflow policy explanations
- auth and transport configuration
- YAML/JSON config loading
- examples
- metrics and management endpoints
- mixed-workload recommendation
- status / roadmap note if still needed

- [ ] **Step 2: Verify README examples match actual public API**

Run either doc-snippet smoke tests or TypeScript compile checks against the snippets.

- [ ] **Step 3: Commit**

Commit: `docs: expand readme for v1 usage and operations`

## Task 7: Add Package Consumer Verification

**Files:**
- Create: `test/package/esm-consumer.mjs`
- Create: `test/package/cjs-consumer.cjs`
- Create: `test/package/plain-js-consumer.mjs`
- Create: `test/integration/package-exports.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing package-consumer checks**

Cover:

- ESM import from built package
- CommonJS `require()` from built package
- plain-JS consumer can use the package without TypeScript tooling
- declaration files are present for TS consumers

- [ ] **Step 2: Run checks and confirm red**

These checks must run against built `dist/` output, not source files.

- [ ] **Step 3: Implement verification scripts and any required package tweaks**

Requirements:

- keep package root exports stable
- do not expose internal modules unintentionally
- ensure built examples and consumer tests reference package shape exactly as published

- [ ] **Step 4: Re-run checks**

Expected: green.

- [ ] **Step 5: Commit**

Commit: `test(package): verify esm cjs and plain-js consumption`

## Task 8: Final Polish Verification

**Files:**
- Verify: `README.md`
- Verify: `dist/index.d.ts`
- Verify: example and config fixtures

- [ ] **Step 1: Run full verification**

Run:

- `npm run typecheck`
- `npm test`
- `npm run test:coverage`
- `npm run build`
- any example/config/package smoke command added in this plan

- [ ] **Step 2: Confirm publish-ready output**

Check:

- `dist/` contains CJS, ESM, and declarations
- README refers only to actual public symbols
- config fixtures are valid and cover both YAML and JSON

- [ ] **Step 3: Commit**

Commit: `chore: verify polish and publish readiness completion`

- [ ] **Step 4: Report final state**

State to the user that Plans 1 through 4 are complete, the package is publish-ready, and the repo contains examples and config parity for the first full v1 release.

## Acceptance Checklist

- YAML and JSON config loading work with named-server selection.
- Builder parity from config is implemented.
- README and examples match the shipped public API.
- Package output is verified from ESM, CommonJS, and plain-JS consumer perspectives.
- The repo is ready for release work rather than missing major product behavior.
