# StreamFenceJs Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the TypeScript project for `streamfence-js` and implement the entire public type system — enums, value objects, `NamespaceSpec` with validation, `ServerEventListener` + event records, and the internal wire-protocol types — with full unit-test coverage. After this plan, the package compiles, publishes its `.d.ts`, and exposes the same public surface as the Java `io.streamfence` package (minus the server itself).

**Architecture:** Faithful port of `streamfence-core`'s flat public API. Enums and value objects live at `src/*.ts`, internal wire protocol at `src/internal/protocol/*.ts`. `NamespaceSpec` is an immutable record with a fluent builder mirroring `NamespaceSpec.java` exactly, including all validation rules (notably: `AT_LEAST_ONCE` namespaces must use `REJECT_NEW` overflow and disallow coalescing). Builds via `tsup` produce dual CJS + ESM + `.d.ts` bundles so plain-JS consumers work identically.

**Tech Stack:** TypeScript 5.x, tsup 8 (esbuild bundler), Vitest 2 (tests), ESLint 9 + `@typescript-eslint`, Prettier 3, Node 20 LTS.

**Reference repo (fetch via `gh api`):** https://github.com/MoshPe/StreamFence — the Java `streamfence-core/src/main/java/io/streamfence/*.java` files are the source of truth for enum members, defaults, and validation rules. Each task below lists the Java reference file(s) to cross-check before implementing.

**Working directory:** `D:\Software_Projects\StreamFenceJs` (empty git repo on branch `dev`, no commits yet).

---

## File Structure Produced by This Plan

```
StreamFenceJs/
├── .eslintrc.cjs
├── .gitignore
├── .prettierrc
├── LICENSE                                         # Apache-2.0
├── README.md                                       # Stub (full README is Plan 4)
├── docs/superpowers/plans/
│   └── 2026-04-10-streamfencejs-foundation.md      # This file
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── src/
│   ├── index.ts                                    # Public re-exports (public API only)
│   ├── DeliveryMode.ts
│   ├── OverflowAction.ts
│   ├── TransportMode.ts
│   ├── AuthMode.ts
│   ├── AuthDecision.ts
│   ├── TokenValidator.ts
│   ├── TlsConfig.ts
│   ├── NamespaceSpec.ts
│   ├── ServerEventListener.ts
│   ├── ServerMetrics.ts                            # Interface + no-op impl; real impl Plan 2
│   └── internal/
│       └── protocol/
│           ├── AckPayload.ts
│           ├── ErrorPayload.ts
│           ├── OutboundTopicMessage.ts
│           ├── PublishRequest.ts
│           ├── SubscriptionRequest.ts
│           ├── TopicMessageEnvelope.ts
│           └── TopicMessageMetadata.ts
└── test/
    └── unit/
        ├── DeliveryMode.test.ts
        ├── OverflowAction.test.ts
        ├── TransportMode.test.ts
        ├── AuthMode.test.ts
        ├── AuthDecision.test.ts
        ├── TlsConfig.test.ts
        ├── NamespaceSpec.test.ts
        ├── ServerEventListener.test.ts
        ├── ServerMetrics.test.ts
        └── internal/
            └── protocol/
                ├── OutboundTopicMessage.test.ts
                ├── TopicMessageMetadata.test.ts
                └── TopicMessageEnvelope.test.ts
```

---

## Task 1: Project Scaffold — Config Files

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `.eslintrc.cjs`, `.prettierrc`, `.gitignore`, `LICENSE`, `README.md`

**Java reference:** None (pure Node/TS tooling).

- [ ] **Step 1: Create `.gitignore`**

Write `D:\Software_Projects\StreamFenceJs\.gitignore`:

```
node_modules/
dist/
coverage/
*.log
.DS_Store
.idea/
.vscode/
*.tsbuildinfo
.env
.env.*
!.env.example
```

- [ ] **Step 2: Create `LICENSE` (Apache-2.0)**

Fetch the canonical Apache-2.0 license text from the Java parent repo to match it verbatim:

Run:
```bash
gh api repos/MoshPe/StreamFence/contents/LICENSE --jq '.content' | base64 -d > /d/Software_Projects/StreamFenceJs/LICENSE
```

Expected: creates a ~11 KB LICENSE file. Verify with `wc -l LICENSE` (expect ~202 lines).

- [ ] **Step 3: Create `README.md` stub**

Write `D:\Software_Projects\StreamFenceJs\README.md`:

```markdown
# streamfence-js

Production-ready delivery control for Node.js Socket.IO servers — backpressure, retries, queue protection, and configurable per-namespace delivery modes.

TypeScript-first port of the Java [StreamFence](https://github.com/MoshPe/StreamFence) library.

> **Status:** under construction. The public type system is in place; the delivery engine, transport layer, and server assembly are being added in follow-up milestones.

## License

Apache-2.0
```

- [ ] **Step 4: Create `package.json`**

Write `D:\Software_Projects\StreamFenceJs\package.json`:

```json
{
  "name": "streamfence-js",
  "version": "0.1.0-alpha.0",
  "description": "Production-ready delivery control for Node.js Socket.IO servers — backpressure, retries, queue protection.",
  "license": "Apache-2.0",
  "author": "MoshPe",
  "homepage": "https://github.com/MoshPe/StreamFenceJs",
  "repository": {
    "type": "git",
    "url": "https://github.com/MoshPe/StreamFenceJs.git"
  },
  "keywords": [
    "socket.io",
    "websocket",
    "backpressure",
    "reliability",
    "streaming"
  ],
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint \"src/**/*.ts\" \"test/**/*.ts\"",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\" \"test/**/*.ts\"",
    "clean": "rimraf dist coverage"
  },
  "devDependencies": {
    "@types/node": "^20.12.0",
    "@typescript-eslint/eslint-plugin": "^7.8.0",
    "@typescript-eslint/parser": "^7.8.0",
    "@vitest/coverage-v8": "^2.1.0",
    "eslint": "^8.57.0",
    "prettier": "^3.2.5",
    "rimraf": "^5.0.5",
    "tsup": "^8.0.2",
    "typescript": "^5.4.5",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 5: Create `tsconfig.json`**

Write `D:\Software_Projects\StreamFenceJs\tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "types": ["node"],
    "outDir": "dist",
    "rootDir": ".",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  },
  "include": ["src/**/*.ts", "test/**/*.ts"],
  "exclude": ["node_modules", "dist", "coverage"]
}
```

- [ ] **Step 6: Create `tsup.config.ts`**

Write `D:\Software_Projects\StreamFenceJs\tsup.config.ts`:

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: 'node20',
  outDir: 'dist',
});
```

- [ ] **Step 7: Create `vitest.config.ts`**

Write `D:\Software_Projects\StreamFenceJs\vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['test/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/index.ts'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
});
```

- [ ] **Step 8: Create `.eslintrc.cjs`**

Write `D:\Software_Projects\StreamFenceJs\.eslintrc.cjs`:

```javascript
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  ignorePatterns: ['dist', 'coverage', 'node_modules', '*.cjs', '*.config.ts'],
};
```

- [ ] **Step 9: Create `.prettierrc`**

Write `D:\Software_Projects\StreamFenceJs\.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

- [ ] **Step 10: Install dependencies**

Run:
```bash
cd /d/Software_Projects/StreamFenceJs && npm install
```

Expected: creates `node_modules/` and `package-lock.json`. No errors, no peer-dep warnings for the core libs.

- [ ] **Step 11: Create the stub `src/index.ts` so tsup has an entry point**

Write `D:\Software_Projects\StreamFenceJs\src\index.ts`:

```typescript
// Public API re-exports. Populated by subsequent tasks.
export {};
```

- [ ] **Step 12: Verify the toolchain works end-to-end**

Run:
```bash
cd /d/Software_Projects/StreamFenceJs && npm run typecheck && npm run build && npm test
```

Expected:
- `typecheck` exits 0 with no output.
- `build` creates `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`, and their source maps.
- `test` reports "No test files found" (not an error at this stage — Vitest exits 0 with a note).

If `vitest run` exits non-zero because no tests exist yet, adjust by creating an empty placeholder test file `test/unit/scaffold.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
describe('scaffold', () => {
  it('is alive', () => {
    expect(true).toBe(true);
  });
});
```
Re-run `npm test`. This placeholder file will be deleted in Task 2 Step 4.

- [ ] **Step 13: Commit scaffold**

Run:
```bash
cd /d/Software_Projects/StreamFenceJs && git add -A && git commit -m "$(cat <<'EOF'
chore: scaffold typescript library with tsup + vitest + eslint

Establishes the build/test/lint toolchain for streamfence-js.
Apache-2.0 license imported verbatim from parent StreamFence repo.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

Expected: commit succeeds; `git log --oneline` shows one commit.

---

## Task 2: Public Enums — `DeliveryMode`, `OverflowAction`, `TransportMode`, `AuthMode`

**Files:**
- Create: `src/DeliveryMode.ts`, `src/OverflowAction.ts`, `src/TransportMode.ts`, `src/AuthMode.ts`
- Create: `test/unit/DeliveryMode.test.ts`, `test/unit/OverflowAction.test.ts`, `test/unit/TransportMode.test.ts`, `test/unit/AuthMode.test.ts`
- Modify: `src/index.ts` (add exports)
- Delete: `test/unit/scaffold.test.ts` (placeholder from Task 1 Step 12 if it was created)

**Java reference:**
- `streamfence-core/src/main/java/io/streamfence/DeliveryMode.java` — members: `BEST_EFFORT`, `AT_LEAST_ONCE`
- `streamfence-core/src/main/java/io/streamfence/OverflowAction.java` — members: `DROP_OLDEST`, `REJECT_NEW`, `COALESCE`, `SNAPSHOT_ONLY`, `SPILL_TO_DISK`
- `streamfence-core/src/main/java/io/streamfence/TransportMode.java` — members: `WS`, `WSS`
- `streamfence-core/src/main/java/io/streamfence/AuthMode.java` — members: `NONE`, `TOKEN`

**Design note:** In TypeScript we use `as const` object enums (not `enum` keyword) so that values are string literals serialisable to YAML/JSON and round-trippable to the Java side. Each enum ships with a companion type alias for the union.

- [ ] **Step 1: Write failing test for `DeliveryMode`**

Write `D:\Software_Projects\StreamFenceJs\test\unit\DeliveryMode.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { DeliveryMode, type DeliveryModeValue } from '../../src/DeliveryMode.js';

describe('DeliveryMode', () => {
  it('has BEST_EFFORT and AT_LEAST_ONCE members matching the Java enum', () => {
    expect(DeliveryMode.BEST_EFFORT).toBe('BEST_EFFORT');
    expect(DeliveryMode.AT_LEAST_ONCE).toBe('AT_LEAST_ONCE');
  });

  it('exposes exactly two members', () => {
    expect(Object.keys(DeliveryMode)).toHaveLength(2);
  });

  it('is assignable to the DeliveryModeValue union type', () => {
    const modes: DeliveryModeValue[] = [DeliveryMode.BEST_EFFORT, DeliveryMode.AT_LEAST_ONCE];
    expect(modes).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd /d/Software_Projects/StreamFenceJs && npx vitest run test/unit/DeliveryMode.test.ts
```

Expected: FAIL — `Cannot find module '../../src/DeliveryMode.js'`.

- [ ] **Step 3: Implement `src/DeliveryMode.ts`**

Write `D:\Software_Projects\StreamFenceJs\src\DeliveryMode.ts`:

```typescript
/**
 * Per-topic message delivery guarantee.
 *
 * Configured on a `NamespaceSpec` and governs how the server handles unacknowledged
 * messages for each subscriber.
 *
 * Mirrors `io.streamfence.DeliveryMode` in the parent Java library.
 */
export const DeliveryMode = {
  /**
   * Messages are delivered at most once with no acknowledgement or retry. The server
   * enqueues the message and discards it according to the configured `OverflowAction`
   * when the queue is full. Suitable for high-frequency feeds where occasional loss is
   * acceptable (e.g. live snapshots, tick data).
   */
  BEST_EFFORT: 'BEST_EFFORT',

  /**
   * Messages are delivered at least once. Each outbound message is assigned a
   * `messageId` and the server retries delivery until the client sends an `ack` or the
   * retry budget configured on the namespace is exhausted.
   */
  AT_LEAST_ONCE: 'AT_LEAST_ONCE',
} as const;

export type DeliveryModeValue = (typeof DeliveryMode)[keyof typeof DeliveryMode];
```

- [ ] **Step 4: Delete scaffold placeholder if present and run test to verify pass**

Run:
```bash
cd /d/Software_Projects/StreamFenceJs && rm -f test/unit/scaffold.test.ts && npx vitest run test/unit/DeliveryMode.test.ts
```

Expected: PASS — 3 tests pass.

- [ ] **Step 5: Write failing test for `OverflowAction`**

Write `D:\Software_Projects\StreamFenceJs\test\unit\OverflowAction.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { OverflowAction, type OverflowActionValue } from '../../src/OverflowAction.js';

describe('OverflowAction', () => {
  it('has all five members matching the Java enum', () => {
    expect(OverflowAction.DROP_OLDEST).toBe('DROP_OLDEST');
    expect(OverflowAction.REJECT_NEW).toBe('REJECT_NEW');
    expect(OverflowAction.COALESCE).toBe('COALESCE');
    expect(OverflowAction.SNAPSHOT_ONLY).toBe('SNAPSHOT_ONLY');
    expect(OverflowAction.SPILL_TO_DISK).toBe('SPILL_TO_DISK');
  });

  it('exposes exactly five members', () => {
    expect(Object.keys(OverflowAction)).toHaveLength(5);
  });

  it('is assignable to the OverflowActionValue union type', () => {
    const actions: OverflowActionValue[] = [
      OverflowAction.DROP_OLDEST,
      OverflowAction.REJECT_NEW,
      OverflowAction.COALESCE,
      OverflowAction.SNAPSHOT_ONLY,
      OverflowAction.SPILL_TO_DISK,
    ];
    expect(actions).toHaveLength(5);
  });
});
```

- [ ] **Step 6: Run test, verify it fails, implement `src/OverflowAction.ts`, re-run**

Run: `npx vitest run test/unit/OverflowAction.test.ts` → FAIL (module not found).

Write `D:\Software_Projects\StreamFenceJs\src\OverflowAction.ts`:

```typescript
/**
 * Action taken when a client's per-topic queue is full and a new message arrives.
 *
 * Configured per namespace and applies uniformly to all topics in that namespace.
 * `DeliveryMode.AT_LEAST_ONCE` namespaces must use `REJECT_NEW`.
 *
 * Mirrors `io.streamfence.OverflowAction` in the parent Java library.
 */
export const OverflowAction = {
  /**
   * Remove the oldest enqueued message and accept the new one. The dropped message is
   * lost and the client will never receive it. Useful for live-data feeds where stale
   * values are less harmful than blocking new updates.
   */
  DROP_OLDEST: 'DROP_OLDEST',

  /**
   * Reject the incoming message and leave the queue unchanged. The publisher receives
   * a `QueueOverflowEvent`. Suitable for reliable pipelines where back-pressure should
   * propagate to the sender.
   */
  REJECT_NEW: 'REJECT_NEW',

  /**
   * Replace the most recent pending message of the same topic with the new one.
   * Effective for snapshot-style feeds (e.g. price tickers) where only the latest value
   * matters. Only applicable to `BEST_EFFORT` namespaces.
   */
  COALESCE: 'COALESCE',

  /**
   * Keep only the latest message in the queue; all older pending messages are
   * discarded. The client receives a single up-to-date snapshot on drain rather than a
   * backlog of stale entries.
   */
  SNAPSHOT_ONLY: 'SNAPSHOT_ONLY',

  /**
   * Overflow messages are spilled to a local disk buffer and replayed when the client's
   * in-memory queue drains. Suitable for bursty workloads where temporary backpressure
   * is acceptable but message loss is not.
   */
  SPILL_TO_DISK: 'SPILL_TO_DISK',
} as const;

export type OverflowActionValue = (typeof OverflowAction)[keyof typeof OverflowAction];
```

Re-run: `npx vitest run test/unit/OverflowAction.test.ts` → PASS (3 tests).

- [ ] **Step 7: Write failing test for `TransportMode`**

Write `D:\Software_Projects\StreamFenceJs\test\unit\TransportMode.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { TransportMode, type TransportModeValue } from '../../src/TransportMode.js';

describe('TransportMode', () => {
  it('has WS and WSS members matching the Java enum', () => {
    expect(TransportMode.WS).toBe('WS');
    expect(TransportMode.WSS).toBe('WSS');
  });

  it('exposes exactly two members', () => {
    expect(Object.keys(TransportMode)).toHaveLength(2);
  });

  it('is assignable to the TransportModeValue union type', () => {
    const modes: TransportModeValue[] = [TransportMode.WS, TransportMode.WSS];
    expect(modes).toHaveLength(2);
  });
});
```

- [ ] **Step 8: Implement `src/TransportMode.ts`**

Run test: `npx vitest run test/unit/TransportMode.test.ts` → FAIL.

Write `D:\Software_Projects\StreamFenceJs\src\TransportMode.ts`:

```typescript
/**
 * Network transport and security mode for the Socket.IO server.
 *
 * Mirrors `io.streamfence.TransportMode` in the parent Java library. This enum controls
 * the TLS posture of the server, not the Engine.IO transport selection. Engine.IO
 * transport (WebSocket vs HTTP polling) is controlled separately per-namespace via
 * `NamespaceSpec.allowPolling`.
 */
export const TransportMode = {
  /** Plain WebSocket (and HTTP long-polling) with no TLS. */
  WS: 'WS',

  /**
   * WebSocket Secure: TLS is required. A `TlsConfig` must be provided via the server
   * builder.
   */
  WSS: 'WSS',
} as const;

export type TransportModeValue = (typeof TransportMode)[keyof typeof TransportMode];
```

Re-run: PASS.

- [ ] **Step 9: Write failing test for `AuthMode`**

Write `D:\Software_Projects\StreamFenceJs\test\unit\AuthMode.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { AuthMode, type AuthModeValue } from '../../src/AuthMode.js';

describe('AuthMode', () => {
  it('has NONE and TOKEN members matching the Java enum', () => {
    expect(AuthMode.NONE).toBe('NONE');
    expect(AuthMode.TOKEN).toBe('TOKEN');
  });

  it('exposes exactly two members', () => {
    expect(Object.keys(AuthMode)).toHaveLength(2);
  });

  it('is assignable to the AuthModeValue union type', () => {
    const modes: AuthModeValue[] = [AuthMode.NONE, AuthMode.TOKEN];
    expect(modes).toHaveLength(2);
  });
});
```

- [ ] **Step 10: Implement `src/AuthMode.ts`**

Run test: FAIL.

Write `D:\Software_Projects\StreamFenceJs\src\AuthMode.ts`:

```typescript
/**
 * Server-level authentication mode.
 *
 * Controls whether connecting clients must supply a bearer token that is validated by
 * a `TokenValidator` before they are allowed to subscribe or publish.
 *
 * Mirrors `io.streamfence.AuthMode` in the parent Java library.
 */
export const AuthMode = {
  /** No authentication is required; all connections are accepted unconditionally. */
  NONE: 'NONE',

  /**
   * Token-based authentication is required. Clients must send a `token` handshake
   * parameter which is forwarded to the configured `TokenValidator`.
   */
  TOKEN: 'TOKEN',
} as const;

export type AuthModeValue = (typeof AuthMode)[keyof typeof AuthMode];
```

Re-run: PASS.

- [ ] **Step 11: Update `src/index.ts` to export the enums**

Write `D:\Software_Projects\StreamFenceJs\src\index.ts`:

```typescript
// ──────── Public API — enums ────────
export { DeliveryMode, type DeliveryModeValue } from './DeliveryMode.js';
export { OverflowAction, type OverflowActionValue } from './OverflowAction.js';
export { TransportMode, type TransportModeValue } from './TransportMode.js';
export { AuthMode, type AuthModeValue } from './AuthMode.js';
```

- [ ] **Step 12: Run full suite + typecheck + build**

Run:
```bash
cd /d/Software_Projects/StreamFenceJs && npm run typecheck && npm test && npm run build
```

Expected: all 12 tests pass; typecheck clean; `dist/index.js` + `dist/index.d.ts` updated with the four enum exports.

- [ ] **Step 13: Commit**

Run:
```bash
cd /d/Software_Projects/StreamFenceJs && git add -A && git commit -m "$(cat <<'EOF'
feat(api): add public enums (DeliveryMode, OverflowAction, TransportMode, AuthMode)

Mirrors io.streamfence.* Java enums exactly — string-literal object enums so
values round-trip through YAML/JSON unchanged.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `AuthDecision` Value Object

**Files:**
- Create: `src/AuthDecision.ts`, `test/unit/AuthDecision.test.ts`
- Modify: `src/index.ts`

**Java reference:** `streamfence-core/src/main/java/io/streamfence/AuthDecision.java` — record with `boolean accepted`, `String principal`, `String reason` and static factories `accept(principal)` / `reject(reason)`.

- [ ] **Step 1: Write failing test**

Write `D:\Software_Projects\StreamFenceJs\test\unit\AuthDecision.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { AuthDecision } from '../../src/AuthDecision.js';

describe('AuthDecision', () => {
  describe('accept()', () => {
    it('creates an accepted decision with the given principal and reason "accepted"', () => {
      const decision = AuthDecision.accept('alice');
      expect(decision.accepted).toBe(true);
      expect(decision.principal).toBe('alice');
      expect(decision.reason).toBe('accepted');
    });
  });

  describe('reject()', () => {
    it('creates a rejected decision with null principal and the given reason', () => {
      const decision = AuthDecision.reject('invalid token');
      expect(decision.accepted).toBe(false);
      expect(decision.principal).toBeNull();
      expect(decision.reason).toBe('invalid token');
    });
  });

  it('freezes the returned object so it cannot be mutated', () => {
    const decision = AuthDecision.accept('bob');
    expect(Object.isFrozen(decision)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/AuthDecision.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement `src/AuthDecision.ts`**

Write `D:\Software_Projects\StreamFenceJs\src\AuthDecision.ts`:

```typescript
/**
 * The result of an authentication or authorization check performed by a `TokenValidator`.
 *
 * An accepted decision carries the resolved `principal` name. A rejected decision
 * carries a human-readable `reason` string that is logged and surfaced to the client as
 * an `error` event.
 *
 * Mirrors `io.streamfence.AuthDecision` in the parent Java library.
 */
export interface AuthDecision {
  readonly accepted: boolean;
  readonly principal: string | null;
  readonly reason: string;
}

/**
 * Static factory functions for building immutable `AuthDecision` values. Instances
 * returned from these factories are frozen so they cannot be mutated by callers.
 */
export const AuthDecision = Object.freeze({
  /**
   * Creates an accepted decision with the given principal name.
   *
   * @param principal the resolved identity of the authenticated client
   * @returns an accepted `AuthDecision`
   */
  accept(principal: string): AuthDecision {
    return Object.freeze({ accepted: true, principal, reason: 'accepted' });
  },

  /**
   * Creates a rejected decision with the given reason.
   *
   * @param reason a human-readable explanation for the rejection
   * @returns a rejected `AuthDecision`
   */
  reject(reason: string): AuthDecision {
    return Object.freeze({ accepted: false, principal: null, reason });
  },
});
```

**Note:** The `AuthDecision` name is used twice — once as an interface (the shape) and once as a frozen factory object. TypeScript's declaration merging allows both under the same exported name, so consumers write `AuthDecision.accept('bob')` (using the factory) and type parameters as `AuthDecision` (using the interface). This matches how Java's `AuthDecision.accept()` + record work.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/unit/AuthDecision.test.ts` → PASS (3 tests).

- [ ] **Step 5: Add export to `src/index.ts`**

Edit `D:\Software_Projects\StreamFenceJs\src\index.ts`, adding after the enum exports:

```typescript
// ──────── Public API — value objects ────────
export { AuthDecision } from './AuthDecision.js';
```

- [ ] **Step 6: Run full suite + commit**

Run:
```bash
cd /d/Software_Projects/StreamFenceJs && npm run typecheck && npm test && git add -A && git commit -m "$(cat <<'EOF'
feat(api): add AuthDecision value object with accept/reject factories

Frozen immutable decision record with static factories mirroring
io.streamfence.AuthDecision. Rejected decisions carry null principal;
accepted decisions carry the resolved identity.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

Expected: all tests pass, commit succeeds.

---

## Task 4: `TokenValidator` Interface

**Files:**
- Create: `src/TokenValidator.ts`
- Modify: `src/index.ts`

**Java reference:** `streamfence-core/src/main/java/io/streamfence/TokenValidator.java` — single method `AuthDecision validate(String token, String namespace, String topic)` where `topic` may be null at handshake time.

**Note:** This task has no runtime behaviour to test — it's a pure type declaration. The contract is verified by any later consumer (e.g. when `StreamFenceServerBuilder.tokenValidator()` is introduced in Plan 3).

- [ ] **Step 1: Implement `src/TokenValidator.ts`**

Write `D:\Software_Projects\StreamFenceJs\src\TokenValidator.ts`:

```typescript
import type { AuthDecision } from './AuthDecision.js';

/**
 * Strategy interface for token-based client authentication.
 *
 * Implement this interface and register it via the server builder's `.tokenValidator()`
 * method to perform custom auth logic. The server invokes `validate()` during the
 * Socket.IO handshake for every namespace configured with `AuthMode.TOKEN`.
 *
 * Implementations must be safe to call from multiple sockets concurrently. Exceptions
 * thrown from `validate()` are caught by the server and treated as a rejection.
 *
 * Mirrors `io.streamfence.TokenValidator` in the parent Java library.
 */
export interface TokenValidator {
  /**
   * Validates a bearer token for a connecting client.
   *
   * @param token the raw token string supplied by the client; never null
   * @param namespace the namespace path the client is connecting to
   * @param topic the topic the client is attempting to access, or `null` if the check
   *              is at connection time rather than subscription time
   * @returns an `AuthDecision` indicating acceptance or rejection; must not be null.
   *          May return a `Promise<AuthDecision>` if the validator needs async I/O
   *          (e.g. a database or remote introspection call).
   */
  validate(
    token: string,
    namespace: string,
    topic: string | null,
  ): AuthDecision | Promise<AuthDecision>;
}
```

**Node-specific deviation from Java:** returning `Promise<AuthDecision>` is allowed because async I/O (e.g. JWT verification, OIDC introspection) is standard in Node. The consuming code in Plan 3 will `await` the result.

- [ ] **Step 2: Add export to `src/index.ts`**

Edit `src/index.ts`, adding after `AuthDecision`:

```typescript
export type { TokenValidator } from './TokenValidator.js';
```

- [ ] **Step 3: Typecheck + build + commit**

Run:
```bash
cd /d/Software_Projects/StreamFenceJs && npm run typecheck && npm run build && git add -A && git commit -m "$(cat <<'EOF'
feat(api): add TokenValidator interface

Strategy interface for pluggable token-based authentication. Mirrors
io.streamfence.TokenValidator; also accepts Promise<AuthDecision> for
async validators (JWT introspection, remote OIDC, etc.).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

Expected: typecheck clean, build succeeds, commit created.

---

## Task 5: `TlsConfig` Value Object

**Files:**
- Create: `src/TlsConfig.ts`, `test/unit/TlsConfig.test.ts`
- Modify: `src/index.ts`

**Java reference:** `streamfence-core/src/main/java/io/streamfence/TLSConfig.java` — record with `certChainPemPath`, `privateKeyPemPath`, `privateKeyPassword`, `keyStorePassword`, `protocol`. Default protocol is `"TLSv1.3"`.

**Design note:** On Node we don't need `keyStorePassword` (there's no PKCS12 conversion — Node's TLS module reads PEM directly). We keep `privateKeyPassword` for encrypted PEMs and `protocol` to constrain the minimum TLS version. Name is TypeScript-idiomatic `TlsConfig` (not `TLSConfig`).

- [ ] **Step 1: Write failing test**

Write `D:\Software_Projects\StreamFenceJs\test\unit\TlsConfig.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { TlsConfig } from '../../src/TlsConfig.js';

describe('TlsConfig', () => {
  it('creates a config with the provided fields and defaults protocol to TLSv1.3', () => {
    const cfg = TlsConfig.create({
      certChainPemPath: '/etc/ssl/cert.pem',
      privateKeyPemPath: '/etc/ssl/key.pem',
    });
    expect(cfg.certChainPemPath).toBe('/etc/ssl/cert.pem');
    expect(cfg.privateKeyPemPath).toBe('/etc/ssl/key.pem');
    expect(cfg.privateKeyPassword).toBeNull();
    expect(cfg.protocol).toBe('TLSv1.3');
  });

  it('accepts an explicit private-key passphrase', () => {
    const cfg = TlsConfig.create({
      certChainPemPath: '/a',
      privateKeyPemPath: '/b',
      privateKeyPassword: 'secret',
    });
    expect(cfg.privateKeyPassword).toBe('secret');
  });

  it('accepts an explicit protocol version', () => {
    const cfg = TlsConfig.create({
      certChainPemPath: '/a',
      privateKeyPemPath: '/b',
      protocol: 'TLSv1.2',
    });
    expect(cfg.protocol).toBe('TLSv1.2');
  });

  it('throws when certChainPemPath is missing or blank', () => {
    expect(() => TlsConfig.create({ certChainPemPath: '', privateKeyPemPath: '/b' })).toThrow(
      'certChainPemPath is required',
    );
  });

  it('throws when privateKeyPemPath is missing or blank', () => {
    expect(() => TlsConfig.create({ certChainPemPath: '/a', privateKeyPemPath: '   ' })).toThrow(
      'privateKeyPemPath is required',
    );
  });

  it('returns a frozen object', () => {
    const cfg = TlsConfig.create({ certChainPemPath: '/a', privateKeyPemPath: '/b' });
    expect(Object.isFrozen(cfg)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/TlsConfig.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement `src/TlsConfig.ts`**

Write `D:\Software_Projects\StreamFenceJs\src\TlsConfig.ts`:

```typescript
/**
 * TLS/SSL configuration for a `TransportMode.WSS` server.
 *
 * Paths are resolved at server start time. When a `TlsConfig` is present, the server
 * loads the PEM-encoded certificate chain and private key via Node's built-in `tls`
 * module.
 *
 * Mirrors `io.streamfence.TLSConfig` in the parent Java library. The Node version
 * drops `keyStorePassword` (no PKCS12 conversion needed) and names the type
 * `TlsConfig` to match TypeScript naming conventions.
 */
export interface TlsConfig {
  readonly certChainPemPath: string;
  readonly privateKeyPemPath: string;
  readonly privateKeyPassword: string | null;
  readonly protocol: string;
}

export interface TlsConfigInput {
  certChainPemPath: string;
  privateKeyPemPath: string;
  privateKeyPassword?: string;
  protocol?: string;
}

const DEFAULT_PROTOCOL = 'TLSv1.3';

function requireNonBlank(value: string | undefined, fieldName: string): string {
  if (value === undefined || value === null || value.trim() === '') {
    throw new Error(`${fieldName} is required`);
  }
  return value;
}

/**
 * Static factory for building validated, immutable `TlsConfig` instances.
 */
export const TlsConfig = Object.freeze({
  /**
   * Builds a new `TlsConfig` from the given input, applying defaults (`protocol` =
   * `TLSv1.3`) and validating that required fields are non-blank.
   *
   * @throws Error if `certChainPemPath` or `privateKeyPemPath` is missing or blank
   */
  create(input: TlsConfigInput): TlsConfig {
    const certChainPemPath = requireNonBlank(input.certChainPemPath, 'certChainPemPath');
    const privateKeyPemPath = requireNonBlank(input.privateKeyPemPath, 'privateKeyPemPath');
    const privateKeyPassword =
      input.privateKeyPassword === undefined || input.privateKeyPassword === ''
        ? null
        : input.privateKeyPassword;
    const protocol =
      input.protocol === undefined || input.protocol.trim() === ''
        ? DEFAULT_PROTOCOL
        : input.protocol;
    return Object.freeze({
      certChainPemPath,
      privateKeyPemPath,
      privateKeyPassword,
      protocol,
    });
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/unit/TlsConfig.test.ts` → PASS (6 tests).

- [ ] **Step 5: Add export + run full suite + commit**

Edit `src/index.ts`, adding:

```typescript
export { TlsConfig, type TlsConfigInput } from './TlsConfig.js';
```

Run:
```bash
cd /d/Software_Projects/StreamFenceJs && npm run typecheck && npm test && git add -A && git commit -m "$(cat <<'EOF'
feat(api): add TlsConfig value object with validated factory

Frozen interface + factory for PEM cert/key paths and optional passphrase.
Defaults protocol to TLSv1.3. Drops Java's keyStorePassword — Node reads PEM
directly so no PKCS12 conversion is needed.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: `NamespaceSpec` — Type and Factory (No Validation Yet)

**Files:**
- Create: `src/NamespaceSpec.ts`
- Create: `test/unit/NamespaceSpec.test.ts`
- Modify: `src/index.ts`

**Java reference:** `streamfence-core/src/main/java/io/streamfence/NamespaceSpec.java` — record with 12 fields and nested `Builder` class. Defaults: `BEST_EFFORT`, `REJECT_NEW`, 64 msgs / 524_288 bytes per client, 1000 ms ack timeout, 0 retries, coalesce=false, allowPolling=true, maxInFlight=1, authRequired=false.

**Decomposition rationale:** `NamespaceSpec` has significant validation logic (15+ rules in the Java constructor). Splitting across three tasks keeps each step small: this task introduces the shape + builder skeleton; Task 7 adds happy-path validation; Task 8 adds `AT_LEAST_ONCE` cross-field constraints.

- [ ] **Step 1: Write failing test for the happy-path builder**

Write `D:\Software_Projects\StreamFenceJs\test\unit\NamespaceSpec.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { NamespaceSpec } from '../../src/NamespaceSpec.js';
import { DeliveryMode } from '../../src/DeliveryMode.js';
import { OverflowAction } from '../../src/OverflowAction.js';

describe('NamespaceSpec — builder happy path', () => {
  it('builds a spec with all defaults when only path + one topic are set', () => {
    const spec = NamespaceSpec.builder('/feed').topic('snapshot').build();
    expect(spec.path).toBe('/feed');
    expect(spec.topics).toEqual(['snapshot']);
    expect(spec.authRequired).toBe(false);
    expect(spec.deliveryMode).toBe(DeliveryMode.BEST_EFFORT);
    expect(spec.overflowAction).toBe(OverflowAction.REJECT_NEW);
    expect(spec.maxQueuedMessagesPerClient).toBe(64);
    expect(spec.maxQueuedBytesPerClient).toBe(524_288);
    expect(spec.ackTimeoutMs).toBe(1000);
    expect(spec.maxRetries).toBe(0);
    expect(spec.coalesce).toBe(false);
    expect(spec.allowPolling).toBe(true);
    expect(spec.maxInFlight).toBe(1);
  });

  it('allows every field to be overridden via the fluent builder', () => {
    const spec = NamespaceSpec.builder('/control')
      .authRequired(true)
      .topics(['alert', 'command'])
      .deliveryMode(DeliveryMode.AT_LEAST_ONCE)
      .overflowAction(OverflowAction.REJECT_NEW)
      .maxQueuedMessagesPerClient(256)
      .maxQueuedBytesPerClient(1_048_576)
      .ackTimeoutMs(2000)
      .maxRetries(5)
      .coalesce(false)
      .allowPolling(false)
      .maxInFlight(4)
      .build();

    expect(spec.path).toBe('/control');
    expect(spec.authRequired).toBe(true);
    expect(spec.topics).toEqual(['alert', 'command']);
    expect(spec.deliveryMode).toBe(DeliveryMode.AT_LEAST_ONCE);
    expect(spec.overflowAction).toBe(OverflowAction.REJECT_NEW);
    expect(spec.maxQueuedMessagesPerClient).toBe(256);
    expect(spec.maxQueuedBytesPerClient).toBe(1_048_576);
    expect(spec.ackTimeoutMs).toBe(2000);
    expect(spec.maxRetries).toBe(5);
    expect(spec.allowPolling).toBe(false);
    expect(spec.maxInFlight).toBe(4);
  });

  it('the topics array on a built spec is a defensive copy (cannot be mutated)', () => {
    const source = ['a', 'b'];
    const spec = NamespaceSpec.builder('/x').topics(source).build();
    source.push('c');
    expect(spec.topics).toEqual(['a', 'b']);
    expect(() => (spec.topics as unknown as string[]).push('z')).toThrow();
  });

  it('the built spec itself is frozen', () => {
    const spec = NamespaceSpec.builder('/x').topic('t').build();
    expect(Object.isFrozen(spec)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/NamespaceSpec.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement `src/NamespaceSpec.ts` — type + builder + minimal validation stub**

Write `D:\Software_Projects\StreamFenceJs\src\NamespaceSpec.ts`:

```typescript
import { DeliveryMode, type DeliveryModeValue } from './DeliveryMode.js';
import { OverflowAction, type OverflowActionValue } from './OverflowAction.js';

/**
 * Immutable specification for a single Socket.IO namespace.
 *
 * A namespace groups one or more topics under a shared delivery policy. Instances are
 * built via `NamespaceSpec.builder(path)` and validated on `build()`.
 *
 * Mirrors `io.streamfence.NamespaceSpec` in the parent Java library.
 */
export interface NamespaceSpec {
  readonly path: string;
  readonly authRequired: boolean;
  readonly topics: readonly string[];
  readonly deliveryMode: DeliveryModeValue;
  readonly overflowAction: OverflowActionValue;
  readonly maxQueuedMessagesPerClient: number;
  readonly maxQueuedBytesPerClient: number;
  readonly ackTimeoutMs: number;
  readonly maxRetries: number;
  readonly coalesce: boolean;
  readonly allowPolling: boolean;
  readonly maxInFlight: number;
}

interface MutableFields {
  path: string;
  authRequired: boolean;
  topics: string[];
  deliveryMode: DeliveryModeValue;
  overflowAction: OverflowActionValue;
  maxQueuedMessagesPerClient: number;
  maxQueuedBytesPerClient: number;
  ackTimeoutMs: number;
  maxRetries: number;
  coalesce: boolean;
  allowPolling: boolean;
  maxInFlight: number;
}

/**
 * Fluent builder for `NamespaceSpec`. Call `NamespaceSpec.builder(path)` to obtain one.
 *
 * Default values (matching Java `NamespaceSpec.Builder`):
 *   deliveryMode               = BEST_EFFORT
 *   overflowAction             = REJECT_NEW
 *   maxQueuedMessagesPerClient = 64
 *   maxQueuedBytesPerClient    = 524_288 (512 KiB)
 *   ackTimeoutMs               = 1_000
 *   maxRetries                 = 0
 *   coalesce                   = false
 *   allowPolling               = true
 *   maxInFlight                = 1
 *   authRequired               = false
 */
export class NamespaceSpecBuilder {
  private readonly fields: MutableFields;

  /** @internal Use `NamespaceSpec.builder(path)` instead. */
  constructor(path: string) {
    this.fields = {
      path,
      authRequired: false,
      topics: [],
      deliveryMode: DeliveryMode.BEST_EFFORT,
      overflowAction: OverflowAction.REJECT_NEW,
      maxQueuedMessagesPerClient: 64,
      maxQueuedBytesPerClient: 524_288,
      ackTimeoutMs: 1_000,
      maxRetries: 0,
      coalesce: false,
      allowPolling: true,
      maxInFlight: 1,
    };
  }

  authRequired(value: boolean): this {
    this.fields.authRequired = value;
    return this;
  }

  topics(topics: readonly string[]): this {
    this.fields.topics = [...topics];
    return this;
  }

  topic(topic: string): this {
    this.fields.topics.push(topic);
    return this;
  }

  deliveryMode(mode: DeliveryModeValue): this {
    this.fields.deliveryMode = mode;
    return this;
  }

  overflowAction(action: OverflowActionValue): this {
    this.fields.overflowAction = action;
    return this;
  }

  maxQueuedMessagesPerClient(value: number): this {
    this.fields.maxQueuedMessagesPerClient = value;
    return this;
  }

  maxQueuedBytesPerClient(value: number): this {
    this.fields.maxQueuedBytesPerClient = value;
    return this;
  }

  ackTimeoutMs(value: number): this {
    this.fields.ackTimeoutMs = value;
    return this;
  }

  maxRetries(value: number): this {
    this.fields.maxRetries = value;
    return this;
  }

  coalesce(value: boolean): this {
    this.fields.coalesce = value;
    return this;
  }

  allowPolling(value: boolean): this {
    this.fields.allowPolling = value;
    return this;
  }

  maxInFlight(value: number): this {
    this.fields.maxInFlight = value;
    return this;
  }

  build(): NamespaceSpec {
    // Defensive copy of topics before validation so post-build mutation cannot affect
    // the produced spec.
    const topicsCopy = Object.freeze([...this.fields.topics]);
    const normalized = { ...this.fields, topics: topicsCopy };

    // maxInFlight defaults to 1 when non-positive (matches Java's normalization).
    if (normalized.maxInFlight <= 0) {
      normalized.maxInFlight = 1;
    }

    // Full validation is added in Task 7 + Task 8. For now, minimal sanity so the
    // happy-path tests in this task pass without rejecting empty topics.
    validateBasic(normalized);

    return Object.freeze({
      path: normalized.path,
      authRequired: normalized.authRequired,
      topics: topicsCopy,
      deliveryMode: normalized.deliveryMode,
      overflowAction: normalized.overflowAction,
      maxQueuedMessagesPerClient: normalized.maxQueuedMessagesPerClient,
      maxQueuedBytesPerClient: normalized.maxQueuedBytesPerClient,
      ackTimeoutMs: normalized.ackTimeoutMs,
      maxRetries: normalized.maxRetries,
      coalesce: normalized.coalesce,
      allowPolling: normalized.allowPolling,
      maxInFlight: normalized.maxInFlight,
    });
  }
}

function validateBasic(_fields: {
  path: string;
  topics: readonly string[];
  deliveryMode: DeliveryModeValue;
  overflowAction: OverflowActionValue;
}): void {
  // Stub — Task 7 adds basic field validation; Task 8 adds cross-field rules.
}

/**
 * Namespace factory entry point. Use `NamespaceSpec.builder('/path')` to obtain a
 * fresh builder seeded with sensible defaults.
 */
export const NamespaceSpec = Object.freeze({
  /**
   * Returns a new `NamespaceSpecBuilder` for the given namespace path.
   *
   * @param path the namespace path (e.g. `'/feed'`); must start with `'/'`
   */
  builder(path: string): NamespaceSpecBuilder {
    return new NamespaceSpecBuilder(path);
  },
});
```

- [ ] **Step 4: Run test to verify all 4 happy-path tests pass**

Run: `npx vitest run test/unit/NamespaceSpec.test.ts` → PASS (4 tests).

- [ ] **Step 5: Add export + commit**

Edit `src/index.ts`, adding:

```typescript
export { NamespaceSpec, type NamespaceSpecBuilder } from './NamespaceSpec.js';
```

Run:
```bash
cd /d/Software_Projects/StreamFenceJs && npm run typecheck && npm test && git add -A && git commit -m "$(cat <<'EOF'
feat(api): add NamespaceSpec type, builder, and defaults

Immutable namespace specification with fluent builder mirroring
io.streamfence.NamespaceSpec.Builder. Defaults match Java exactly:
BEST_EFFORT, REJECT_NEW, 64 msgs / 512 KiB per client, 1s ack timeout,
maxInFlight=1. Validation is added in follow-up tasks.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: `NamespaceSpec` — Basic Field Validation

**Files:**
- Modify: `src/NamespaceSpec.ts` (replace `validateBasic` stub)
- Modify: `test/unit/NamespaceSpec.test.ts` (append validation tests)

**Java reference:** `NamespaceSpec.java` compact-constructor lines 49–86 — covers path format, topic list, null enums, positive numeric bounds.

- [ ] **Step 1: Write failing tests for basic validation**

Append to `D:\Software_Projects\StreamFenceJs\test\unit\NamespaceSpec.test.ts`:

```typescript
describe('NamespaceSpec — basic field validation', () => {
  const valid = () => NamespaceSpec.builder('/x').topic('t');

  it('rejects a path that does not start with "/"', () => {
    expect(() => NamespaceSpec.builder('feed').topic('t').build()).toThrow(
      "namespace path must start with '/'",
    );
  });

  it('rejects a blank path', () => {
    expect(() => NamespaceSpec.builder('').topic('t').build()).toThrow(
      "namespace path must start with '/'",
    );
  });

  it('rejects an empty topic list', () => {
    expect(() => NamespaceSpec.builder('/x').build()).toThrow(
      'namespace must define at least one topic',
    );
  });

  it('rejects a blank topic name', () => {
    expect(() => NamespaceSpec.builder('/x').topics(['', 'valid']).build()).toThrow(
      'topic names must not be blank in namespace /x',
    );
  });

  it('rejects a whitespace-only topic name', () => {
    expect(() => NamespaceSpec.builder('/x').topics(['   ']).build()).toThrow(
      'topic names must not be blank in namespace /x',
    );
  });

  it('rejects duplicate topic names', () => {
    expect(() => NamespaceSpec.builder('/x').topics(['a', 'b', 'a']).build()).toThrow(
      'duplicate topic in namespace /x: a',
    );
  });

  it('rejects non-positive maxQueuedMessagesPerClient', () => {
    expect(() => valid().maxQueuedMessagesPerClient(0).build()).toThrow(
      'maxQueuedMessagesPerClient must be positive',
    );
    expect(() => valid().maxQueuedMessagesPerClient(-1).build()).toThrow(
      'maxQueuedMessagesPerClient must be positive',
    );
  });

  it('rejects non-positive maxQueuedBytesPerClient', () => {
    expect(() => valid().maxQueuedBytesPerClient(0).build()).toThrow(
      'maxQueuedBytesPerClient must be positive',
    );
  });

  it('rejects non-positive ackTimeoutMs', () => {
    expect(() => valid().ackTimeoutMs(0).build()).toThrow('ackTimeoutMs must be positive');
  });

  it('rejects negative maxRetries', () => {
    expect(() => valid().maxRetries(-1).build()).toThrow(
      'maxRetries must be zero or positive',
    );
  });

  it('normalizes non-positive maxInFlight to 1', () => {
    const spec = valid().maxInFlight(0).build();
    expect(spec.maxInFlight).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests, verify the new block fails**

Run: `npx vitest run test/unit/NamespaceSpec.test.ts` → the new describe block should fail with "expected to throw ..." because the current stub does nothing; the original 4 happy-path tests still pass.

- [ ] **Step 3: Replace `validateBasic` in `src/NamespaceSpec.ts`**

Edit `D:\Software_Projects\StreamFenceJs\src\NamespaceSpec.ts`: locate the stub `validateBasic` function (last function in the file) and replace the **entire function body** with the following. Also, update the `build()` method so that `validateBasic` is called **before** the `Object.freeze` so errors surface with the original intent. Replace the `validateBasic` function with:

```typescript
function validateBasic(fields: {
  path: string;
  topics: readonly string[];
  deliveryMode: DeliveryModeValue;
  overflowAction: OverflowActionValue;
  maxQueuedMessagesPerClient: number;
  maxQueuedBytesPerClient: number;
  ackTimeoutMs: number;
  maxRetries: number;
}): void {
  if (!fields.path || fields.path.trim() === '' || !fields.path.startsWith('/')) {
    throw new Error("namespace path must start with '/'");
  }
  if (fields.topics.length === 0) {
    throw new Error('namespace must define at least one topic');
  }
  const seen = new Set<string>();
  for (const topic of fields.topics) {
    if (topic === null || topic === undefined || topic.trim() === '') {
      throw new Error(`topic names must not be blank in namespace ${fields.path}`);
    }
    if (seen.has(topic)) {
      throw new Error(`duplicate topic in namespace ${fields.path}: ${topic}`);
    }
    seen.add(topic);
  }
  if (fields.deliveryMode === null || fields.deliveryMode === undefined) {
    throw new Error('deliveryMode is required');
  }
  if (fields.overflowAction === null || fields.overflowAction === undefined) {
    throw new Error('overflowAction is required');
  }
  if (fields.maxQueuedMessagesPerClient <= 0) {
    throw new Error('maxQueuedMessagesPerClient must be positive');
  }
  if (fields.maxQueuedBytesPerClient <= 0) {
    throw new Error('maxQueuedBytesPerClient must be positive');
  }
  if (fields.ackTimeoutMs <= 0) {
    throw new Error('ackTimeoutMs must be positive');
  }
  if (fields.maxRetries < 0) {
    throw new Error('maxRetries must be zero or positive');
  }
}
```

Also update the `build()` method's call to pass the full `normalized` object:

Locate `validateBasic(normalized);` in the `build()` method and leave it as-is — the signature change above means `normalized` already has all required fields. TypeScript will now enforce this.

- [ ] **Step 4: Run tests to verify all pass**

Run: `npx vitest run test/unit/NamespaceSpec.test.ts` → PASS (15 tests — 4 happy-path + 11 new validation).

- [ ] **Step 5: Commit**

Run:
```bash
cd /d/Software_Projects/StreamFenceJs && git add -A && git commit -m "$(cat <<'EOF'
feat(api): add NamespaceSpec basic field validation

Validates path format, topic list (non-empty, no blanks, no duplicates),
required enums, and positive numeric bounds. Normalizes non-positive
maxInFlight to 1. Cross-field AT_LEAST_ONCE rules come next.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: `NamespaceSpec` — `AT_LEAST_ONCE` Cross-field Rules

**Files:**
- Modify: `src/NamespaceSpec.ts`
- Modify: `test/unit/NamespaceSpec.test.ts`

**Java reference:** `NamespaceSpec.java` compact-constructor lines 87–100:
1. `AT_LEAST_ONCE` must use `REJECT_NEW` overflow.
2. `AT_LEAST_ONCE` cannot enable `coalesce`.
3. `AT_LEAST_ONCE` must allow at least one retry (`maxRetries > 0`).
4. `maxInFlight` must not exceed `maxQueuedMessagesPerClient` (only under `AT_LEAST_ONCE`).

- [ ] **Step 1: Write failing tests**

Append to `D:\Software_Projects\StreamFenceJs\test\unit\NamespaceSpec.test.ts`:

```typescript
describe('NamespaceSpec — AT_LEAST_ONCE cross-field rules', () => {
  const reliable = () =>
    NamespaceSpec.builder('/r')
      .topic('t')
      .deliveryMode(DeliveryMode.AT_LEAST_ONCE)
      .maxRetries(3);

  it('requires overflowAction = REJECT_NEW', () => {
    expect(() =>
      reliable().overflowAction(OverflowAction.DROP_OLDEST).build(),
    ).toThrow('AT_LEAST_ONCE namespaces must use REJECT_NEW overflowAction');
    expect(() =>
      reliable().overflowAction(OverflowAction.COALESCE).build(),
    ).toThrow('AT_LEAST_ONCE namespaces must use REJECT_NEW overflowAction');
    expect(() =>
      reliable().overflowAction(OverflowAction.SNAPSHOT_ONLY).build(),
    ).toThrow('AT_LEAST_ONCE namespaces must use REJECT_NEW overflowAction');
  });

  it('forbids coalesce = true', () => {
    expect(() => reliable().coalesce(true).build()).toThrow(
      'AT_LEAST_ONCE namespaces cannot enable coalescing',
    );
  });

  it('requires maxRetries > 0', () => {
    expect(() =>
      NamespaceSpec.builder('/r')
        .topic('t')
        .deliveryMode(DeliveryMode.AT_LEAST_ONCE)
        .maxRetries(0)
        .build(),
    ).toThrow('AT_LEAST_ONCE namespaces must allow at least one retry');
  });

  it('rejects maxInFlight > maxQueuedMessagesPerClient', () => {
    expect(() =>
      reliable().maxQueuedMessagesPerClient(4).maxInFlight(8).build(),
    ).toThrow('maxInFlight must not exceed maxQueuedMessagesPerClient');
  });

  it('accepts a fully valid AT_LEAST_ONCE configuration', () => {
    const spec = reliable()
      .overflowAction(OverflowAction.REJECT_NEW)
      .maxQueuedMessagesPerClient(32)
      .maxInFlight(8)
      .ackTimeoutMs(2000)
      .build();
    expect(spec.deliveryMode).toBe(DeliveryMode.AT_LEAST_ONCE);
    expect(spec.maxInFlight).toBe(8);
  });

  it('BEST_EFFORT namespaces do not enforce the AT_LEAST_ONCE cross-field rules', () => {
    // coalesce is allowed
    expect(() =>
      NamespaceSpec.builder('/b').topic('t').coalesce(true).build(),
    ).not.toThrow();
    // DROP_OLDEST is allowed
    expect(() =>
      NamespaceSpec.builder('/b')
        .topic('t')
        .overflowAction(OverflowAction.DROP_OLDEST)
        .build(),
    ).not.toThrow();
    // maxInFlight > maxQueuedMessagesPerClient is allowed (only AT_LEAST_ONCE rejects it)
    expect(() =>
      NamespaceSpec.builder('/b')
        .topic('t')
        .maxQueuedMessagesPerClient(4)
        .maxInFlight(8)
        .build(),
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests — verify the new block fails**

Run: `npx vitest run test/unit/NamespaceSpec.test.ts`. The new describe block fails because the current validation doesn't enforce cross-field rules.

- [ ] **Step 3: Add a new `validateReliableMode` function and call it from `build()`**

Edit `D:\Software_Projects\StreamFenceJs\src\NamespaceSpec.ts`. Add a new function after `validateBasic` and **before** `NamespaceSpec` factory:

```typescript
function validateReliableMode(fields: {
  deliveryMode: DeliveryModeValue;
  overflowAction: OverflowActionValue;
  coalesce: boolean;
  maxRetries: number;
  maxInFlight: number;
  maxQueuedMessagesPerClient: number;
}): void {
  if (fields.deliveryMode !== DeliveryMode.AT_LEAST_ONCE) {
    return;
  }
  if (fields.overflowAction !== OverflowAction.REJECT_NEW) {
    throw new Error('AT_LEAST_ONCE namespaces must use REJECT_NEW overflowAction');
  }
  if (fields.coalesce) {
    throw new Error('AT_LEAST_ONCE namespaces cannot enable coalescing');
  }
  if (fields.maxRetries <= 0) {
    throw new Error('AT_LEAST_ONCE namespaces must allow at least one retry');
  }
  if (fields.maxInFlight > fields.maxQueuedMessagesPerClient) {
    throw new Error('maxInFlight must not exceed maxQueuedMessagesPerClient');
  }
}
```

Then inside the `build()` method of `NamespaceSpecBuilder`, add a call to `validateReliableMode` **after** the existing `validateBasic(normalized);` line:

```typescript
    validateBasic(normalized);
    validateReliableMode(normalized);
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `npx vitest run test/unit/NamespaceSpec.test.ts` → PASS (21 tests total).

- [ ] **Step 5: Run full suite + commit**

Run:
```bash
cd /d/Software_Projects/StreamFenceJs && npm run typecheck && npm test && git add -A && git commit -m "$(cat <<'EOF'
feat(api): enforce AT_LEAST_ONCE cross-field rules in NamespaceSpec

Reliable namespaces must use REJECT_NEW, cannot coalesce, must allow
retries, and maxInFlight must not exceed maxQueuedMessagesPerClient.
Mirrors the NamespaceSpec.java compact-constructor checks exactly.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Protocol Types — Metadata and Envelope

**Files:**
- Create: `src/internal/protocol/TopicMessageMetadata.ts`
- Create: `src/internal/protocol/TopicMessageEnvelope.ts`
- Create: `test/unit/internal/protocol/TopicMessageMetadata.test.ts`
- Create: `test/unit/internal/protocol/TopicMessageEnvelope.test.ts`

**Java reference:**
- `streamfence-core/src/main/java/io/streamfence/internal/protocol/TopicMessageMetadata.java`
- `streamfence-core/src/main/java/io/streamfence/internal/protocol/TopicMessageEnvelope.java`

**Note:** These are internal types (under `src/internal/`) and are **not** re-exported from `src/index.ts`. They're used only inside the library.

- [ ] **Step 1: Write failing test for `TopicMessageMetadata`**

Write `D:\Software_Projects\StreamFenceJs\test\unit\internal\protocol\TopicMessageMetadata.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createTopicMessageMetadata } from '../../../../src/internal/protocol/TopicMessageMetadata.js';

describe('TopicMessageMetadata', () => {
  it('creates a frozen metadata record with all fields', () => {
    const meta = createTopicMessageMetadata({
      namespace: '/feed',
      topic: 'snapshot',
      messageId: 'abc-123',
      ackRequired: false,
    });
    expect(meta.namespace).toBe('/feed');
    expect(meta.topic).toBe('snapshot');
    expect(meta.messageId).toBe('abc-123');
    expect(meta.ackRequired).toBe(false);
    expect(Object.isFrozen(meta)).toBe(true);
  });

  it('supports ackRequired = true for AT_LEAST_ONCE messages', () => {
    const meta = createTopicMessageMetadata({
      namespace: '/control',
      topic: 'alert',
      messageId: 'xyz-789',
      ackRequired: true,
    });
    expect(meta.ackRequired).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, verify fails, implement, re-run**

Run: `npx vitest run test/unit/internal/protocol/TopicMessageMetadata.test.ts` → FAIL.

Write `D:\Software_Projects\StreamFenceJs\src\internal\protocol\TopicMessageMetadata.ts`:

```typescript
/**
 * Internal protocol type — metadata attached to every outbound message.
 *
 * Mirrors `io.streamfence.internal.protocol.TopicMessageMetadata` in the parent Java
 * library. NOT part of the public API.
 *
 * @internal
 */
export interface TopicMessageMetadata {
  readonly namespace: string;
  readonly topic: string;
  readonly messageId: string;
  readonly ackRequired: boolean;
}

/**
 * Creates an immutable metadata record. Frozen so internal callers cannot mutate it.
 *
 * @internal
 */
export function createTopicMessageMetadata(input: {
  namespace: string;
  topic: string;
  messageId: string;
  ackRequired: boolean;
}): TopicMessageMetadata {
  return Object.freeze({
    namespace: input.namespace,
    topic: input.topic,
    messageId: input.messageId,
    ackRequired: input.ackRequired,
  });
}
```

Re-run: PASS (2 tests).

- [ ] **Step 3: Write failing test for `TopicMessageEnvelope`**

Write `D:\Software_Projects\StreamFenceJs\test\unit\internal\protocol\TopicMessageEnvelope.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createTopicMessageMetadata } from '../../../../src/internal/protocol/TopicMessageMetadata.js';
import { createTopicMessageEnvelope } from '../../../../src/internal/protocol/TopicMessageEnvelope.js';

describe('TopicMessageEnvelope', () => {
  it('wraps metadata and an arbitrary payload, freezing the envelope', () => {
    const meta = createTopicMessageMetadata({
      namespace: '/feed',
      topic: 'snapshot',
      messageId: 'id-1',
      ackRequired: false,
    });
    const env = createTopicMessageEnvelope(meta, { value: 42 });
    expect(env.metadata).toBe(meta);
    expect(env.payload).toEqual({ value: 42 });
    expect(Object.isFrozen(env)).toBe(true);
  });

  it('accepts a Buffer payload (the pre-serialized wire format)', () => {
    const meta = createTopicMessageMetadata({
      namespace: '/feed',
      topic: 'snapshot',
      messageId: 'id-2',
      ackRequired: false,
    });
    const buf = Buffer.from('{"x":1}');
    const env = createTopicMessageEnvelope(meta, buf);
    expect(env.payload).toBe(buf);
  });
});
```

- [ ] **Step 4: Run test, verify fails, implement, re-run**

Run: FAIL.

Write `D:\Software_Projects\StreamFenceJs\src\internal\protocol\TopicMessageEnvelope.ts`:

```typescript
import type { TopicMessageMetadata } from './TopicMessageMetadata.js';

/**
 * Internal protocol type — metadata + payload pair for one outbound message.
 *
 * Mirrors `io.streamfence.internal.protocol.TopicMessageEnvelope` in the parent Java
 * library. NOT part of the public API.
 *
 * The payload is typed as `unknown` because the delivery engine may carry either a raw
 * application object (before serialization) or a pre-serialized `Buffer` (after).
 *
 * @internal
 */
export interface TopicMessageEnvelope {
  readonly metadata: TopicMessageMetadata;
  readonly payload: unknown;
}

/**
 * Creates an immutable envelope.
 *
 * @internal
 */
export function createTopicMessageEnvelope(
  metadata: TopicMessageMetadata,
  payload: unknown,
): TopicMessageEnvelope {
  return Object.freeze({ metadata, payload });
}
```

Re-run: PASS (2 tests).

- [ ] **Step 5: Commit**

Run:
```bash
cd /d/Software_Projects/StreamFenceJs && npm run typecheck && npm test && git add -A && git commit -m "$(cat <<'EOF'
feat(protocol): add internal TopicMessageMetadata and TopicMessageEnvelope

Frozen wire metadata + envelope pair mirroring
io.streamfence.internal.protocol.*. Payload is typed unknown so the same
envelope carries raw objects pre-serialization and Buffers post.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Protocol Types — Small Wire Records

**Files:**
- Create: `src/internal/protocol/AckPayload.ts`
- Create: `src/internal/protocol/ErrorPayload.ts`
- Create: `src/internal/protocol/PublishRequest.ts`
- Create: `src/internal/protocol/SubscriptionRequest.ts`

**Java reference:**
- `AckPayload.java` — record `(topic, messageId)`
- `ErrorPayload.java` — record `(code, message)`
- `PublishRequest.java` — record `(topic, payload, token)` (Java uses `JsonNode` for payload; Node uses `unknown`)
- `SubscriptionRequest.java` — record `(topic, token)`

All four are trivial record-like interfaces with no behaviour — one task writes all four since each file is under 20 lines.

- [ ] **Step 1: Implement all four files directly (no separate failing tests — these are plain type declarations exercised in Plan 3 integration tests)**

Write `D:\Software_Projects\StreamFenceJs\src\internal\protocol\AckPayload.ts`:

```typescript
/**
 * Internal wire type — client → server ack for a RELIABLE message.
 *
 * Mirrors `io.streamfence.internal.protocol.AckPayload`. NOT part of the public API.
 *
 * @internal
 */
export interface AckPayload {
  readonly topic: string;
  readonly messageId: string;
}
```

Write `D:\Software_Projects\StreamFenceJs\src\internal\protocol\ErrorPayload.ts`:

```typescript
/**
 * Internal wire type — server → client error response.
 *
 * Mirrors `io.streamfence.internal.protocol.ErrorPayload`. NOT part of the public API.
 *
 * @internal
 */
export interface ErrorPayload {
  readonly code: string;
  readonly message: string;
}
```

Write `D:\Software_Projects\StreamFenceJs\src\internal\protocol\PublishRequest.ts`:

```typescript
/**
 * Internal wire type — client → server publish request (when inbound publishing is
 * permitted by the namespace policy).
 *
 * Mirrors `io.streamfence.internal.protocol.PublishRequest`. The Java version uses
 * Jackson's `JsonNode` for the payload; Node uses `unknown` since Socket.IO already
 * hands back parsed JavaScript values.
 *
 * NOT part of the public API.
 *
 * @internal
 */
export interface PublishRequest {
  readonly topic: string;
  readonly payload: unknown;
  readonly token: string | null;
}
```

Write `D:\Software_Projects\StreamFenceJs\src\internal\protocol\SubscriptionRequest.ts`:

```typescript
/**
 * Internal wire type — client → server subscribe or unsubscribe request.
 *
 * Mirrors `io.streamfence.internal.protocol.SubscriptionRequest`. NOT part of the
 * public API.
 *
 * @internal
 */
export interface SubscriptionRequest {
  readonly topic: string;
  readonly token: string | null;
}
```

- [ ] **Step 2: Add a trivial type-assertion test so the files are exercised by `tsc`**

Write `D:\Software_Projects\StreamFenceJs\test\unit\internal\protocol\SmallProtocolRecords.test.ts`:

```typescript
import { describe, it, expectTypeOf } from 'vitest';
import type { AckPayload } from '../../../../src/internal/protocol/AckPayload.js';
import type { ErrorPayload } from '../../../../src/internal/protocol/ErrorPayload.js';
import type { PublishRequest } from '../../../../src/internal/protocol/PublishRequest.js';
import type { SubscriptionRequest } from '../../../../src/internal/protocol/SubscriptionRequest.js';

describe('small protocol records — type shape', () => {
  it('AckPayload has topic + messageId strings', () => {
    expectTypeOf<AckPayload>().toEqualTypeOf<{
      readonly topic: string;
      readonly messageId: string;
    }>();
  });

  it('ErrorPayload has code + message strings', () => {
    expectTypeOf<ErrorPayload>().toEqualTypeOf<{
      readonly code: string;
      readonly message: string;
    }>();
  });

  it('PublishRequest has topic string, unknown payload, nullable token', () => {
    expectTypeOf<PublishRequest>().toEqualTypeOf<{
      readonly topic: string;
      readonly payload: unknown;
      readonly token: string | null;
    }>();
  });

  it('SubscriptionRequest has topic string and nullable token', () => {
    expectTypeOf<SubscriptionRequest>().toEqualTypeOf<{
      readonly topic: string;
      readonly token: string | null;
    }>();
  });
});
```

- [ ] **Step 3: Run tests + typecheck**

Run: `npx vitest run test/unit/internal/protocol/SmallProtocolRecords.test.ts && npm run typecheck`.

Expected: PASS (4 type assertion tests), typecheck clean.

- [ ] **Step 4: Commit**

Run:
```bash
cd /d/Software_Projects/StreamFenceJs && git add -A && git commit -m "$(cat <<'EOF'
feat(protocol): add Ack, Error, Publish, Subscribe wire records

Four small frozen interfaces mirroring the corresponding
io.streamfence.internal.protocol.* Java records. Payload typed as
unknown (Socket.IO already hands back parsed values in Node).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Protocol Type — `OutboundTopicMessage`

**Files:**
- Create: `src/internal/protocol/OutboundTopicMessage.ts`
- Create: `test/unit/internal/protocol/OutboundTopicMessage.test.ts`

**Java reference:** `OutboundTopicMessage.java` — record `(eventName, metadata, eventArguments, estimatedBytes)`. Java defensively clones `eventArguments` on read and write to prevent mutation. Requires `estimatedBytes > 0` and non-null fields.

- [ ] **Step 1: Write failing test**

Write `D:\Software_Projects\StreamFenceJs\test\unit\internal\protocol\OutboundTopicMessage.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createTopicMessageMetadata } from '../../../../src/internal/protocol/TopicMessageMetadata.js';
import {
  createOutboundTopicMessage,
  type OutboundTopicMessage,
} from '../../../../src/internal/protocol/OutboundTopicMessage.js';

function meta() {
  return createTopicMessageMetadata({
    namespace: '/feed',
    topic: 'snapshot',
    messageId: 'id-1',
    ackRequired: false,
  });
}

describe('OutboundTopicMessage', () => {
  it('creates a frozen message with eventName, metadata, args, and byte size', () => {
    const m: OutboundTopicMessage = createOutboundTopicMessage({
      eventName: 'snapshot',
      metadata: meta(),
      eventArguments: [{ value: 42 }],
      estimatedBytes: 256,
    });
    expect(m.eventName).toBe('snapshot');
    expect(m.metadata.topic).toBe('snapshot');
    expect(m.eventArguments).toEqual([{ value: 42 }]);
    expect(m.estimatedBytes).toBe(256);
    expect(Object.isFrozen(m)).toBe(true);
  });

  it('takes a defensive copy of eventArguments on creation', () => {
    const args: unknown[] = [{ a: 1 }];
    const m = createOutboundTopicMessage({
      eventName: 'evt',
      metadata: meta(),
      eventArguments: args,
      estimatedBytes: 1,
    });
    args.push({ b: 2 });
    expect(m.eventArguments).toHaveLength(1);
  });

  it('returns a defensive copy of eventArguments on read', () => {
    const m = createOutboundTopicMessage({
      eventName: 'evt',
      metadata: meta(),
      eventArguments: [{ a: 1 }],
      estimatedBytes: 1,
    });
    const firstRead = m.eventArguments;
    const secondRead = m.eventArguments;
    expect(firstRead).not.toBe(secondRead);
    expect(firstRead).toEqual(secondRead);
  });

  it('throws when estimatedBytes <= 0', () => {
    expect(() =>
      createOutboundTopicMessage({
        eventName: 'e',
        metadata: meta(),
        eventArguments: [],
        estimatedBytes: 0,
      }),
    ).toThrow('estimatedBytes must be positive');
    expect(() =>
      createOutboundTopicMessage({
        eventName: 'e',
        metadata: meta(),
        eventArguments: [],
        estimatedBytes: -1,
      }),
    ).toThrow('estimatedBytes must be positive');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/internal/protocol/OutboundTopicMessage.test.ts` → FAIL.

- [ ] **Step 3: Implement `src/internal/protocol/OutboundTopicMessage.ts`**

Write `D:\Software_Projects\StreamFenceJs\src\internal\protocol\OutboundTopicMessage.ts`:

```typescript
import type { TopicMessageMetadata } from './TopicMessageMetadata.js';

/**
 * Internal wire type — one outbound message ready to be handed to `socket.emit`.
 *
 * Mirrors `io.streamfence.internal.protocol.OutboundTopicMessage` in the parent Java
 * library. The `eventArguments` array is defensively copied on both creation and
 * read so no caller can mutate another's view.
 *
 * NOT part of the public API.
 *
 * @internal
 */
export interface OutboundTopicMessage {
  readonly eventName: string;
  readonly metadata: TopicMessageMetadata;
  /**
   * The args passed to `socket.emit(eventName, ...args)`. Each access returns a fresh
   * shallow copy of the array — this prevents one lane's mutation from leaking into
   * another lane's view (matches Java's defensive-copy accessor).
   */
  readonly eventArguments: readonly unknown[];
  readonly estimatedBytes: number;
}

/**
 * Creates a new `OutboundTopicMessage`, validating `estimatedBytes > 0` and taking a
 * defensive copy of `eventArguments`.
 *
 * @internal
 */
export function createOutboundTopicMessage(input: {
  eventName: string;
  metadata: TopicMessageMetadata;
  eventArguments: readonly unknown[];
  estimatedBytes: number;
}): OutboundTopicMessage {
  if (input.estimatedBytes <= 0) {
    throw new Error('estimatedBytes must be positive');
  }
  // Defensive copy on creation.
  const argsSnapshot: unknown[] = [...input.eventArguments];
  const eventName = input.eventName;
  const metadata = input.metadata;
  const estimatedBytes = input.estimatedBytes;

  return Object.freeze({
    eventName,
    metadata,
    estimatedBytes,
    /**
     * Getter that returns a fresh shallow copy each time — matches the defensive
     * accessor in `OutboundTopicMessage.java`.
     */
    get eventArguments(): readonly unknown[] {
      return [...argsSnapshot];
    },
  });
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run test/unit/internal/protocol/OutboundTopicMessage.test.ts` → PASS (4 tests).

- [ ] **Step 5: Commit**

Run:
```bash
cd /d/Software_Projects/StreamFenceJs && npm run typecheck && npm test && git add -A && git commit -m "$(cat <<'EOF'
feat(protocol): add OutboundTopicMessage with defensive-copy semantics

Mirrors OutboundTopicMessage.java — validates estimatedBytes > 0 and
defensively copies eventArguments on both creation and read so callers
cannot cross-contaminate each other's views.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: `ServerEventListener` Interface + Event Record Types

**Files:**
- Create: `src/ServerEventListener.ts`
- Create: `test/unit/ServerEventListener.test.ts`
- Modify: `src/index.ts`

**Java reference:** `streamfence-core/src/main/java/io/streamfence/ServerEventListener.java` — 13 callbacks + 13 event record types. All callbacks have default empty implementations.

**Design note:** In TypeScript we express "default empty implementations" by making all listener methods **optional**. Consumers implement only what they need. The library's internal dispatcher must handle `undefined` methods gracefully.

- [ ] **Step 1: Write failing test**

Write `D:\Software_Projects\StreamFenceJs\test\unit\ServerEventListener.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type {
  ServerEventListener,
  ServerStartingEvent,
  ServerStartedEvent,
  ServerStoppingEvent,
  ServerStoppedEvent,
  ClientConnectedEvent,
  ClientDisconnectedEvent,
  SubscribedEvent,
  UnsubscribedEvent,
  PublishAcceptedEvent,
  PublishRejectedEvent,
  QueueOverflowEvent,
  AuthRejectedEvent,
  RetryEvent,
  RetryExhaustedEvent,
} from '../../src/ServerEventListener.js';

describe('ServerEventListener', () => {
  it('accepts a listener that implements only a subset of callbacks', () => {
    const listener: ServerEventListener = {
      onClientConnected(event: ClientConnectedEvent) {
        expect(event.namespace).toBeDefined();
      },
    };
    expect(listener.onClientConnected).toBeDefined();
    expect(listener.onClientDisconnected).toBeUndefined();
  });

  it('accepts a listener that implements every callback', () => {
    const listener: ServerEventListener = {
      onServerStarting(_e: ServerStartingEvent) {},
      onServerStarted(_e: ServerStartedEvent) {},
      onServerStopping(_e: ServerStoppingEvent) {},
      onServerStopped(_e: ServerStoppedEvent) {},
      onClientConnected(_e: ClientConnectedEvent) {},
      onClientDisconnected(_e: ClientDisconnectedEvent) {},
      onSubscribed(_e: SubscribedEvent) {},
      onUnsubscribed(_e: UnsubscribedEvent) {},
      onPublishAccepted(_e: PublishAcceptedEvent) {},
      onPublishRejected(_e: PublishRejectedEvent) {},
      onQueueOverflow(_e: QueueOverflowEvent) {},
      onAuthRejected(_e: AuthRejectedEvent) {},
      onRetry(_e: RetryEvent) {},
      onRetryExhausted(_e: RetryExhaustedEvent) {},
    };
    expect(Object.keys(listener)).toHaveLength(14);
  });

  it('event records carry the expected field shapes', () => {
    const connected: ClientConnectedEvent = {
      namespace: '/feed',
      clientId: 'sock-1',
      transport: 'websocket',
      principal: null,
    };
    const retry: RetryEvent = {
      namespace: '/control',
      clientId: 'sock-2',
      topic: 'alert',
      messageId: 'm-9',
      retryCount: 3,
    };
    expect(connected.transport).toBe('websocket');
    expect(retry.retryCount).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/ServerEventListener.test.ts` → FAIL.

- [ ] **Step 3: Implement `src/ServerEventListener.ts`**

Write `D:\Software_Projects\StreamFenceJs\src\ServerEventListener.ts`:

```typescript
/**
 * Listener interface for server lifecycle and runtime events.
 *
 * Register a listener via the server builder's `.listener()` method. Every callback is
 * optional — only implement what you care about. Exceptions thrown from any callback
 * are caught and logged by the server and do not affect the runtime or other listeners.
 *
 * Mirrors `io.streamfence.ServerEventListener` in the parent Java library.
 */
export interface ServerEventListener {
  onServerStarting?(event: ServerStartingEvent): void;
  onServerStarted?(event: ServerStartedEvent): void;
  onServerStopping?(event: ServerStoppingEvent): void;
  onServerStopped?(event: ServerStoppedEvent): void;

  onClientConnected?(event: ClientConnectedEvent): void;
  onClientDisconnected?(event: ClientDisconnectedEvent): void;

  onSubscribed?(event: SubscribedEvent): void;
  onUnsubscribed?(event: UnsubscribedEvent): void;

  onPublishAccepted?(event: PublishAcceptedEvent): void;
  onPublishRejected?(event: PublishRejectedEvent): void;
  onQueueOverflow?(event: QueueOverflowEvent): void;

  onAuthRejected?(event: AuthRejectedEvent): void;

  onRetry?(event: RetryEvent): void;
  onRetryExhausted?(event: RetryExhaustedEvent): void;
}

/** Fired immediately before the Socket.IO server binds its port. */
export interface ServerStartingEvent {
  readonly host: string;
  readonly port: number;
  readonly managementPort: number;
}

/** Fired after the Socket.IO server has successfully started. */
export interface ServerStartedEvent {
  readonly host: string;
  readonly port: number;
  readonly managementPort: number;
}

/** Fired when server shutdown begins. */
export interface ServerStoppingEvent {
  readonly host: string;
  readonly port: number;
  readonly managementPort: number;
}

/** Fired after the server has fully stopped. */
export interface ServerStoppedEvent {
  readonly host: string;
  readonly port: number;
  readonly managementPort: number;
}

/** Fired when a client opens a Socket.IO connection to a namespace. */
export interface ClientConnectedEvent {
  readonly namespace: string;
  readonly clientId: string;
  readonly transport: 'websocket' | 'polling';
  readonly principal: string | null;
}

/** Fired when a client disconnects from a namespace. */
export interface ClientDisconnectedEvent {
  readonly namespace: string;
  readonly clientId: string;
}

/** Fired when a client successfully subscribes to a topic. */
export interface SubscribedEvent {
  readonly namespace: string;
  readonly clientId: string;
  readonly topic: string;
}

/** Fired when a client unsubscribes from a topic. */
export interface UnsubscribedEvent {
  readonly namespace: string;
  readonly clientId: string;
  readonly topic: string;
}

/** Fired when a message is successfully enqueued for a subscriber. */
export interface PublishAcceptedEvent {
  readonly namespace: string;
  readonly clientId: string;
  readonly topic: string;
}

/**
 * Fired when a publish is rejected for a subscriber (e.g. queue full with
 * `OverflowAction.REJECT_NEW`).
 */
export interface PublishRejectedEvent {
  readonly namespace: string;
  readonly clientId: string;
  readonly topic: string;
  readonly reasonCode: string;
  readonly reason: string;
}

/**
 * Fired when a client's per-topic queue overflows and the configured `OverflowAction`
 * is applied.
 */
export interface QueueOverflowEvent {
  readonly namespace: string;
  readonly clientId: string;
  readonly topic: string;
  readonly reason: string;
}

/**
 * Fired when a connection attempt is rejected by the `TokenValidator` or the auth
 * rate limiter.
 */
export interface AuthRejectedEvent {
  readonly namespace: string;
  readonly clientId: string;
  readonly remoteAddress: string;
  readonly reason: string;
}

/** Fired each time an `AT_LEAST_ONCE` message is retried. */
export interface RetryEvent {
  readonly namespace: string;
  readonly clientId: string;
  readonly topic: string;
  readonly messageId: string;
  /** 1-based retry attempt number. */
  readonly retryCount: number;
}

/**
 * Fired when all retry attempts for an `AT_LEAST_ONCE` message are exhausted without
 * an acknowledgement. The message is discarded.
 */
export interface RetryExhaustedEvent {
  readonly namespace: string;
  readonly clientId: string;
  readonly topic: string;
  readonly messageId: string;
  /** Total number of retry attempts made. */
  readonly retryCount: number;
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `npx vitest run test/unit/ServerEventListener.test.ts` → PASS (3 tests).

- [ ] **Step 5: Add exports + commit**

Edit `src/index.ts`, adding:

```typescript
export type {
  ServerEventListener,
  ServerStartingEvent,
  ServerStartedEvent,
  ServerStoppingEvent,
  ServerStoppedEvent,
  ClientConnectedEvent,
  ClientDisconnectedEvent,
  SubscribedEvent,
  UnsubscribedEvent,
  PublishAcceptedEvent,
  PublishRejectedEvent,
  QueueOverflowEvent,
  AuthRejectedEvent,
  RetryEvent,
  RetryExhaustedEvent,
} from './ServerEventListener.js';
```

Run:
```bash
cd /d/Software_Projects/StreamFenceJs && npm run typecheck && npm test && git add -A && git commit -m "$(cat <<'EOF'
feat(api): add ServerEventListener interface + 14 event record types

Mirrors io.streamfence.ServerEventListener — 14 optional callbacks
(server lifecycle, client lifecycle, subscriptions, publish outcomes,
auth, retries) and their corresponding frozen event records.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: `ServerMetrics` Interface + No-Op Implementation

**Files:**
- Create: `src/ServerMetrics.ts`, `test/unit/ServerMetrics.test.ts`
- Modify: `src/index.ts`

**Java reference:** `streamfence-core/src/main/java/io/streamfence/ServerMetrics.java` — Micrometer-backed counter/gauge collector. The Java version has 13 `recordXxx` methods.

**Design note:** In Plan 1 we define the **interface shape + a no-op implementation**. The real `prom-client`-backed implementation lands in Plan 2 alongside the delivery engine that calls these counters. The no-op lets us wire the rest of the code together without pulling in a metrics dependency yet.

- [ ] **Step 1: Write failing test**

Write `D:\Software_Projects\StreamFenceJs\test\unit\ServerMetrics.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { ServerMetrics, NoopServerMetrics } from '../../src/ServerMetrics.js';

describe('ServerMetrics — interface shape', () => {
  it('NoopServerMetrics implements every recording method and all are no-ops', () => {
    const m: ServerMetrics = new NoopServerMetrics();
    expect(() => m.recordConnect('/feed')).not.toThrow();
    expect(() => m.recordDisconnect('/feed')).not.toThrow();
    expect(() => m.recordPublish('/feed', 'snapshot', 1024)).not.toThrow();
    expect(() => m.recordReceived('/control', 'user-action', 128)).not.toThrow();
    expect(() => m.recordQueueOverflow('/feed', 'snapshot', 'DROP_OLDEST')).not.toThrow();
    expect(() => m.recordRetry('/control', 'alert')).not.toThrow();
    expect(() => m.recordRetryExhausted('/control', 'alert')).not.toThrow();
    expect(() => m.recordDropped('/feed', 'snapshot')).not.toThrow();
    expect(() => m.recordCoalesced('/feed', 'snapshot')).not.toThrow();
    expect(() => m.recordAuthRejected('/control')).not.toThrow();
    expect(() => m.recordAuthRateLimited('/control')).not.toThrow();
  });

  it('NoopServerMetrics.scrape() returns an empty string', () => {
    const m = new NoopServerMetrics();
    expect(m.scrape()).toBe('');
  });
});
```

- [ ] **Step 2: Run test, verify it fails, implement, re-run**

Run: FAIL.

Write `D:\Software_Projects\StreamFenceJs\src\ServerMetrics.ts`:

```typescript
/**
 * Metrics collector interface for a running `StreamFenceServer`.
 *
 * Mirrors the `recordXxx` surface of `io.streamfence.ServerMetrics` in the parent Java
 * library. The real `prom-client`-backed implementation ships with Plan 2 alongside
 * the delivery engine that calls these methods. This file defines the interface and
 * a `NoopServerMetrics` used as a default so the rest of the code can wire cleanly
 * without requiring a metrics dependency.
 */
export interface ServerMetrics {
  /** Records a new client connection on `namespace`. */
  recordConnect(namespace: string): void;

  /** Records a client disconnection from `namespace`. */
  recordDisconnect(namespace: string): void;

  /** Records an outbound message published to `topic` on `namespace`. */
  recordPublish(namespace: string, topic: string, bytes: number): void;

  /** Records an inbound message received from a client on `topic`. */
  recordReceived(namespace: string, topic: string, bytes: number): void;

  /** Records a queue overflow event for `topic` on `namespace`. */
  recordQueueOverflow(namespace: string, topic: string, reason: string): void;

  /** Records one retry attempt for an unacknowledged message. */
  recordRetry(namespace: string, topic: string): void;

  /** Records a message whose retry budget was exhausted. */
  recordRetryExhausted(namespace: string, topic: string): void;

  /** Records a message dropped due to `OverflowAction.DROP_OLDEST`. */
  recordDropped(namespace: string, topic: string): void;

  /** Records a message coalesced due to `OverflowAction.COALESCE`. */
  recordCoalesced(namespace: string, topic: string): void;

  /** Records an authentication rejection on `namespace`. */
  recordAuthRejected(namespace: string): void;

  /** Records an auth attempt rejected by the rate limiter on `namespace`. */
  recordAuthRateLimited(namespace: string): void;

  /**
   * Produces a Prometheus text-format scrape body. The no-op implementation returns an
   * empty string; the real implementation in Plan 2 returns the actual exposition.
   */
  scrape(): string;
}

/**
 * No-op `ServerMetrics` — used as a placeholder when no real metrics backend is
 * configured. All `recordXxx` methods are empty; `scrape()` returns an empty string.
 */
export class NoopServerMetrics implements ServerMetrics {
  recordConnect(_namespace: string): void {}
  recordDisconnect(_namespace: string): void {}
  recordPublish(_namespace: string, _topic: string, _bytes: number): void {}
  recordReceived(_namespace: string, _topic: string, _bytes: number): void {}
  recordQueueOverflow(_namespace: string, _topic: string, _reason: string): void {}
  recordRetry(_namespace: string, _topic: string): void {}
  recordRetryExhausted(_namespace: string, _topic: string): void {}
  recordDropped(_namespace: string, _topic: string): void {}
  recordCoalesced(_namespace: string, _topic: string): void {}
  recordAuthRejected(_namespace: string): void {}
  recordAuthRateLimited(_namespace: string): void {}
  scrape(): string {
    return '';
  }
}
```

Re-run: PASS (2 tests).

- [ ] **Step 3: Add exports + commit**

Edit `src/index.ts`, adding:

```typescript
export { type ServerMetrics, NoopServerMetrics } from './ServerMetrics.js';
```

Run:
```bash
cd /d/Software_Projects/StreamFenceJs && npm run typecheck && npm test && git add -A && git commit -m "$(cat <<'EOF'
feat(api): add ServerMetrics interface and NoopServerMetrics default

Defines the full recordXxx surface mirroring ServerMetrics.java. The
prom-client-backed real implementation ships with Plan 2; the no-op
default lets the rest of the code wire cleanly without pulling a
metrics dependency yet.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Final Index Wiring, Coverage Sanity Check, Build Verification

**Files:**
- Modify: `src/index.ts` (final tidy pass)
- Verify: `dist/index.d.ts` contains the expected exports

- [ ] **Step 1: Review and tidy `src/index.ts`**

Open `src/index.ts` and ensure the file exactly matches:

```typescript
// ──────── Public API — enums ────────
export { DeliveryMode, type DeliveryModeValue } from './DeliveryMode.js';
export { OverflowAction, type OverflowActionValue } from './OverflowAction.js';
export { TransportMode, type TransportModeValue } from './TransportMode.js';
export { AuthMode, type AuthModeValue } from './AuthMode.js';

// ──────── Public API — value objects ────────
export { AuthDecision } from './AuthDecision.js';
export type { TokenValidator } from './TokenValidator.js';
export { TlsConfig, type TlsConfigInput } from './TlsConfig.js';
export { NamespaceSpec, type NamespaceSpecBuilder } from './NamespaceSpec.js';

// ──────── Public API — event listener types ────────
export type {
  ServerEventListener,
  ServerStartingEvent,
  ServerStartedEvent,
  ServerStoppingEvent,
  ServerStoppedEvent,
  ClientConnectedEvent,
  ClientDisconnectedEvent,
  SubscribedEvent,
  UnsubscribedEvent,
  PublishAcceptedEvent,
  PublishRejectedEvent,
  QueueOverflowEvent,
  AuthRejectedEvent,
  RetryEvent,
  RetryExhaustedEvent,
} from './ServerEventListener.js';

// ──────── Public API — metrics ────────
export { type ServerMetrics, NoopServerMetrics } from './ServerMetrics.js';
```

If the file already matches, leave it as-is. If the export order differs from earlier tasks (because tasks appended ad-hoc), rewrite the file to match the above ordering exactly.

- [ ] **Step 2: Run the full test suite with coverage**

Run:
```bash
cd /d/Software_Projects/StreamFenceJs && npm run test:coverage
```

Expected:
- All tests pass.
- Coverage thresholds met: lines ≥ 90%, functions ≥ 90%, branches ≥ 85%, statements ≥ 90%.
- If any threshold is not met, investigate which file is under-covered and **add a test for it in this step before proceeding** — do not lower the threshold.

- [ ] **Step 3: Run typecheck + lint + build**

Run:
```bash
cd /d/Software_Projects/StreamFenceJs && npm run typecheck && npm run lint && npm run build
```

Expected:
- typecheck exits 0, no output.
- lint exits 0, no warnings or errors.
- build creates:
  - `dist/index.js` (ESM)
  - `dist/index.cjs` (CJS)
  - `dist/index.d.ts`
  - `dist/index.js.map`, `dist/index.cjs.map`

- [ ] **Step 4: Verify the emitted `.d.ts` exposes the expected public surface**

Run:
```bash
cd /d/Software_Projects/StreamFenceJs && grep -E '^(export|type)' dist/index.d.ts | head -30
```

Expected output (order may vary slightly based on tsup's bundling):
```
export { DeliveryMode, DeliveryModeValue };
export { OverflowAction, OverflowActionValue };
export { TransportMode, TransportModeValue };
export { AuthMode, AuthModeValue };
export { AuthDecision };
export { TokenValidator };
export { TlsConfig, TlsConfigInput };
export { NamespaceSpec, NamespaceSpecBuilder };
export { ServerEventListener, ... };
export { ServerMetrics, NoopServerMetrics };
```

If any expected symbol is missing, trace back to the task that should have added it and fix the omission.

- [ ] **Step 5: Final commit**

Run:
```bash
cd /d/Software_Projects/StreamFenceJs && git add -A && git commit -m "$(cat <<'EOF'
chore: tidy index.ts exports and verify public API surface

Finalizes Plan 1 (Foundation). Public API surface matches Java
io.streamfence flat package: 4 enums, AuthDecision, TokenValidator,
TlsConfig, NamespaceSpec + builder, ServerEventListener + event records,
and the ServerMetrics interface with a no-op default.

Coverage ≥ 90% lines / 85% branches. Ready for Plan 2 (delivery engine).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 6: Plan 1 is complete — announce to the user**

Report to the user:
> Plan 1 (Foundation) complete. streamfence-js now exposes the full public type system with:
>
> - 4 enums (DeliveryMode, OverflowAction, TransportMode, AuthMode)
> - 4 value objects (AuthDecision, TokenValidator interface, TlsConfig, NamespaceSpec with full validation)
> - Full ServerEventListener interface + 14 event record types
> - ServerMetrics interface + NoopServerMetrics default
> - 7 internal protocol wire types
>
> All tests green, coverage ≥ 90%, dist builds CJS + ESM + .d.ts cleanly. Ready to proceed with Plan 2: Delivery Engine.

---

## Out of Scope for This Plan

Explicitly not implemented here — covered by follow-up plans:

- **`StreamFenceServerSpec` + YAML/JSON config loading** — Plan 4 (polish)
- **The delivery engine** (`ClientLane`, `TopicDispatcher`, `PublishedMessage`, etc.) — Plan 2
- **Reliable delivery layer** (`AckTracker`, `RetryService`) — Plan 2
- **Real `prom-client`-backed `ServerMetrics` implementation** — Plan 2
- **Security primitives** (`AuthRateLimiter`, `StaticTokenValidator`) — Plan 3
- **Transport/socket.io wiring** (`SocketServerBootstrap`, `NamespaceHandler`) — Plan 3
- **`StreamFenceServer` and its builder** — Plan 3
- **Examples, full README, npm publish prep** — Plan 4

## Verification Checklist (run at the end of the plan)

1. `npm run typecheck` → exits 0, no output.
2. `npm test` → all unit tests pass (≈ 50 tests total across ~12 files).
3. `npm run test:coverage` → lines ≥ 90%, branches ≥ 85%, functions ≥ 90%.
4. `npm run lint` → 0 warnings, 0 errors.
5. `npm run build` → `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts` all present and non-empty.
6. `git log --oneline` → 13 commits (one per task, plus the scaffold commit in Task 1).
7. Spot-check `dist/index.d.ts` — every symbol listed in Task 14 Step 4 is present.
