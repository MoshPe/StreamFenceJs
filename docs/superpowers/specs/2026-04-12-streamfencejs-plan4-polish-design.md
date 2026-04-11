# StreamFenceJs — Plan 4: Polish & Publish Readiness Design

**Date:** 2026-04-12
**Status:** Approved
**Builds on:** Plans 1–3 complete and merged to `dev`

---

## 1. Scope

### In scope

| Area | Deliverables |
|---|---|
| Config schema | `RawServerConfig`, `RawServerEntry`, `RawNamespaceConfig` (internal types) |
| Config loading | `ServerConfigLoader` — file → raw config (YAML + JSON) |
| Config mapping | `SpecMapper` — raw config → `StreamFenceServerSpec` |
| Builder parity | `StreamFenceServerBuilder.fromYaml()` + `fromJson()` static factory methods |
| Examples | `examples/mixed-workload/` + `examples/single-server/` runnable via `tsx` |
| README | Full v1 documentation replacing current stub |
| Package verification | ESM + CJS consumer smoke scripts |
| Dependencies | `yaml` (runtime), `tsx` (dev) |

### Out of scope (deferred to v2)

- `SPILL_TO_DISK` filesystem backend — currently returns `REJECTED` with "not supported"
- TLS PEM hot reload
- npm publish workflow / release CI

---

## 2. File Layout

### New source files

```
src/internal/config/
├── TopicPolicy.ts                    (exists)
├── RawServerConfig.ts                NEW — top-level file shape
├── RawServerEntry.ts                 NEW — one server block
├── RawNamespaceConfig.ts             NEW — one namespace block
├── ServerConfigLoader.ts             NEW — file I/O → RawServerConfig
└── SpecMapper.ts                     NEW — RawServerConfig → StreamFenceServerSpec
```

### Modified source files

```
src/StreamFenceServerBuilder.ts       add static fromYaml() + fromJson()
src/index.ts                          no change needed (builder already exported)
```

### New example files

```
examples/
├── README.md
├── mixed-workload/
│   ├── streamfence.yaml
│   ├── server.ts
│   └── client.ts
└── single-server/
    ├── server.ts
    └── client.ts
```

### New test files

```
test/unit/internal/config/
├── ServerConfigLoader.test.ts
└── SpecMapper.test.ts

test/unit/
└── StreamFenceServerBuilder.fromConfig.test.ts

test/fixtures/config/
├── streamfence.valid.yaml
├── streamfence.minimal.yaml
├── streamfence.valid.json
└── streamfence.invalid.yaml

test/package/
├── esm-consumer.mjs
└── cjs-consumer.cjs
```

### New config files

```
tsconfig.examples.json                extends tsconfig.json, includes examples/
```

### Modified docs

```
README.md                             full v1 replacement
```

---

## 3. Config YAML/JSON Schema

### Top-level structure

```yaml
servers:
  <name>:            # arbitrary server name used for selection
    host: "0.0.0.0"             # optional, default "0.0.0.0"
    port: 3000                  # required
    managementPort: 9100        # optional, default null (disabled)
    transport: WS               # optional — WS | WSS, default WS
    engineIoTransport: WEBSOCKET_OR_POLLING  # optional — WEBSOCKET_ONLY | WEBSOCKET_OR_POLLING, default WEBSOCKET_OR_POLLING
    auth: NONE                  # optional — NONE | TOKEN, default NONE
    spillRootPath: ".streamfence-spill"  # optional, default ".streamfence-spill"
    tls:                        # optional block — only valid when transport: WSS
      certChainPemPath: "/etc/ssl/cert.pem"   # required if tls block present
      privateKeyPemPath: "/etc/ssl/key.pem"   # required if tls block present
      protocol: "TLSv1.3"      # optional, default TLSv1.3
      privateKeyPassword: ""    # optional
    namespaces:                 # required, at least one entry
      - path: /feed             # required, must start with /
        topics: [snapshot, delta]   # required, at least one
        deliveryMode: BEST_EFFORT   # optional — BEST_EFFORT | AT_LEAST_ONCE, default BEST_EFFORT
        overflowAction: DROP_OLDEST # optional — DROP_OLDEST | REJECT_NEW | COALESCE | SNAPSHOT_ONLY | SPILL_TO_DISK, default REJECT_NEW
        maxQueuedMessagesPerClient: 128   # optional, default 64
        maxQueuedBytesPerClient: 1048576  # optional, default 524288
        ackTimeoutMs: 1000              # optional, default 1000
        maxRetries: 0                   # optional, default 0
        coalesce: false                 # optional, default false
        allowPolling: true              # optional, default true
        maxInFlight: 1                  # optional, default 1
        authRequired: false             # optional, default false
```

### Required vs optional

| Field | Required | Default |
|---|---|---|
| `port` | Yes | — |
| `namespaces` | Yes (≥1 entry) | — |
| `namespaces[].path` | Yes | — |
| `namespaces[].topics` | Yes (≥1 entry) | — |
| All other namespace fields | No | Match `NamespaceSpec.builder()` defaults |
| All other server fields | No | Match `StreamFenceServerBuilder` defaults |
| `tls` block | No | `null` (no TLS) |

---

## 4. Internal Config Types

### `RawServerConfig` (`src/internal/config/RawServerConfig.ts`)

Plain interface — serialization-friendly, no behavior. Represents the parsed file contents.

```typescript
export interface RawServerConfig {
  servers: Record<string, RawServerEntry>;
}
```

### `RawServerEntry` (`src/internal/config/RawServerEntry.ts`)

```typescript
export interface RawServerEntry {
  host?: string;
  port: number;
  managementPort?: number | null;
  transport?: string;
  engineIoTransport?: string;
  auth?: string;
  spillRootPath?: string;
  tls?: {
    certChainPemPath: string;
    privateKeyPemPath: string;
    protocol?: string;
    privateKeyPassword?: string;
  };
  namespaces: RawNamespaceConfig[];
}
```

### `RawNamespaceConfig` (`src/internal/config/RawNamespaceConfig.ts`)

```typescript
export interface RawNamespaceConfig {
  path: string;
  topics: string[];
  deliveryMode?: string;
  overflowAction?: string;
  maxQueuedMessagesPerClient?: number;
  maxQueuedBytesPerClient?: number;
  ackTimeoutMs?: number;
  maxRetries?: number;
  coalesce?: boolean;
  allowPolling?: boolean;
  maxInFlight?: number;
  authRequired?: boolean;
}
```

All three interfaces are `@internal` — never exported from `src/index.ts`.

---

## 5. `ServerConfigLoader`

**Location:** `src/internal/config/ServerConfigLoader.ts`

**Responsibility:** Pure I/O — reads file, parses format, returns `RawServerConfig`. No validation of field values.

**API:**
```typescript
export function loadServerConfig(filePath: string): RawServerConfig
```

**Behaviour:**
- Uses `fs.readFileSync(filePath, 'utf8')` — synchronous (config loading is startup-time)
- Detects format from file extension: `.yaml` / `.yml` → `parse()` from `yaml` package; `.json` → `JSON.parse()`
- Unsupported extension → throws `Error: Unsupported config file extension ".toml" (expected .yaml, .yml, or .json): /path/to/file`
- File not found → wraps Node `ENOENT` error: `Failed to read config file "/path/to/file": ENOENT...`
- Parse failure → wraps parse error: `Failed to parse config file "/path/to/file": <parse message>`

---

## 6. `SpecMapper`

**Location:** `src/internal/config/SpecMapper.ts`

**Responsibility:** Pure transformation — no I/O, no side effects. Takes a `RawServerConfig` + server name, returns a fully constructed `StreamFenceServerSpec`.

**API:**
```typescript
export function mapServerConfig(
  config: RawServerConfig,
  serverName: string,
): StreamFenceServerSpec
```

**Mapping rules:**

1. Look up `config.servers[serverName]` — throws `Error: No server named "feed" found in config (available: control, metrics)` if missing
2. For each namespace entry, call `NamespaceSpec.builder(ns.path)` with all present fields, then `.build()` — validation errors from the builder propagate as-is
3. For `deliveryMode`, `overflowAction`, `transport`, `engineIoTransport`, `auth` — validate against the corresponding const enum; throw `Error: Invalid deliveryMode "FOO" for namespace /feed (expected: BEST_EFFORT, AT_LEAST_ONCE)` style messages
4. If `tls` block present, call `TlsConfig.create(tlsInput)` — validation errors propagate as-is
5. Reject duplicate namespace paths: `Error: Duplicate namespace path "/feed" in server "feed"`
6. Assemble via `createStreamFenceServerSpec({...})` with defaults for missing optional fields

**Defaults applied by mapper** (when field absent from raw config):
- `host` → `"0.0.0.0"`
- `managementPort` → `null`
- `transport` → `TransportMode.WS`
- `engineIoTransport` → `EngineIoTransportMode.WEBSOCKET_OR_POLLING`
- `auth` → `AuthMode.NONE`
- `spillRootPath` → `".streamfence-spill"`
- `tls` → `null`
- `listeners` → `[]`
- `metrics` → `new NoopServerMetrics()`
- `tokenValidator` → `null`

---

## 7. Builder Parity

**Location:** `src/StreamFenceServerBuilder.ts` (modified)

Two **static** factory methods added. They return a `StreamFenceServerBuilder` pre-populated from the config, which can then be further customised before calling `.buildServer()`.

```typescript
static fromYaml(filePath: string, options: { server: string }): StreamFenceServerBuilder
static fromJson(filePath: string, options: { server: string }): StreamFenceServerBuilder
```

**Implementation:**

```typescript
static fromYaml(filePath: string, options: { server: string }): StreamFenceServerBuilder {
  const raw = loadServerConfig(filePath);   // ServerConfigLoader
  const spec = mapServerConfig(raw, options.server);  // SpecMapper
  return StreamFenceServerBuilder.fromSpec(spec);
}

static fromJson(filePath: string, options: { server: string }): StreamFenceServerBuilder {
  // identical — loadServerConfig detects .json extension automatically
  const raw = loadServerConfig(filePath);
  const spec = mapServerConfig(raw, options.server);
  return StreamFenceServerBuilder.fromSpec(spec);
}

private static fromSpec(spec: StreamFenceServerSpec): StreamFenceServerBuilder {
  const builder = new StreamFenceServerBuilder();
  // populate all builder fields from spec
  builder.hostValue = spec.host;
  builder.portValue = spec.port;
  // ... etc
  return builder;
}
```

All builder fields that `fromSpec` sets are already private — no API surface changes other than the two new static methods. Subsequent calls to `.listener()`, `.metrics()`, `.namespace()`, etc. after `fromYaml` behave exactly as with a fresh builder.

---

## 8. Examples

### `examples/mixed-workload/server.ts`

Starts two servers from a single YAML config file. Demonstrates:
- `StreamFenceServerBuilder.fromYaml()` with named server selection
- `server.publish()` on an interval
- graceful shutdown on `SIGINT`

```typescript
// imports from '../../src/index.js' — dev-run mode via tsx
import { StreamFenceServerBuilder } from '../../src/index.js';

const feedServer = StreamFenceServerBuilder
  .fromYaml('./streamfence.yaml', { server: 'feed' })
  .buildServer();

const controlServer = StreamFenceServerBuilder
  .fromYaml('./streamfence.yaml', { server: 'control' })
  .buildServer();

await feedServer.start();
await controlServer.start();

// publish snapshots every 500ms
setInterval(() => {
  feedServer.publish('/feed', 'snapshot', { price: Math.random() * 100 });
}, 500);

process.on('SIGINT', async () => {
  await feedServer.stop();
  await controlServer.stop();
  process.exit(0);
});
```

### `examples/single-server/server.ts`

Programmatic builder API, one namespace, no config file. Demonstrates the non-YAML path and shows both approaches exist.

### `examples/mixed-workload/client.ts` and `examples/single-server/client.ts`

Socket.IO clients that connect, subscribe to a topic, and log received messages. Shows the client-side subscription protocol (`subscribe` event with `{ topic }` payload).

### Run command (in `examples/README.md`)

```bash
npx tsx examples/mixed-workload/server.ts
# in another terminal:
npx tsx examples/mixed-workload/client.ts
```

---

## 9. README Structure

Full replacement of the current stub. Sections:

1. **Header** — name, one-liner, Apache-2.0 badge, Node >=20 badge
2. **What it is** — 2–3 sentences; Socket.IO delivery control, Java StreamFence port, what problems it solves (backpressure, retries, queue protection)
3. **When to use one server vs two** — mixed-workload pattern; why BEST_EFFORT broadcast and AT_LEAST_ONCE control should run on separate ports
4. **Install** — `npm install streamfence-js`
5. **Quick start** — minimal programmatic server (10–15 lines)
6. **Config file loading** — `fromYaml` + `fromJson`; YAML schema snippet with inline comments
7. **Delivery modes** — BEST_EFFORT vs AT_LEAST_ONCE table
8. **Overflow policies** — table: action, behaviour, recommended use
9. **Authentication** — `AuthMode.TOKEN`, `TokenValidator` interface, `StaticTokenValidator`
10. **TLS** — `TransportMode.WSS` + `TlsConfig.create()`
11. **Metrics & management** — `PromServerMetrics`, `/health` + `/metrics`, management port
12. **Event listener** — `ServerEventListener` interface snippet showing 2–3 callbacks
13. **API reference** — grouped table of all public exports
14. **Examples** — link to `examples/` with brief description of each
15. **Status / roadmap** — v1 complete; SPILL_TO_DISK + TLS hot reload planned for v2
16. **License** — Apache-2.0

All TypeScript code snippets use only actual exported symbols. README snippets are verified manually during the README task to ensure they match the public API.

---

## 10. Package Verification

### `test/package/esm-consumer.mjs`

```javascript
import { StreamFenceServer, StreamFenceServerBuilder, DeliveryMode, OverflowAction, PromServerMetrics } from '../../dist/index.js';
console.assert(typeof StreamFenceServer === 'function', 'StreamFenceServer missing');
console.assert(typeof StreamFenceServerBuilder === 'function', 'StreamFenceServerBuilder missing');
console.assert(DeliveryMode.BEST_EFFORT === 'BEST_EFFORT', 'DeliveryMode missing');
console.assert(OverflowAction.REJECT_NEW === 'REJECT_NEW', 'OverflowAction missing');
console.assert(typeof PromServerMetrics === 'function', 'PromServerMetrics missing');
console.log('ESM consumer: OK');
```

### `test/package/cjs-consumer.cjs`

```javascript
const { StreamFenceServer, StreamFenceServerBuilder, DeliveryMode, PromServerMetrics } = require('../../dist/index.cjs');
console.assert(typeof StreamFenceServer === 'function', 'StreamFenceServer missing');
console.assert(typeof StreamFenceServerBuilder === 'function', 'StreamFenceServerBuilder missing');
console.assert(DeliveryMode.AT_LEAST_ONCE === 'AT_LEAST_ONCE', 'DeliveryMode missing');
console.assert(typeof PromServerMetrics === 'function', 'PromServerMetrics missing');
console.log('CJS consumer: OK');
```

### `tsconfig.examples.json` (new, at project root)

Extends the main `tsconfig.json` but includes the `examples/` directory:

```json
{
  "extends": "./tsconfig.json",
  "include": ["examples/**/*.ts", "src/**/*.ts"]
}
```

### `package.json` script additions

```json
"examples:check": "tsc --noEmit --project tsconfig.examples.json",
"test:package": "npm run build && node test/package/esm-consumer.mjs && node test/package/cjs-consumer.cjs"
```

---

## 11. Testing Strategy

**Coverage targets:** ≥90% lines/statements/functions, ≥85% branches — same as Plans 1–3.

**`ServerConfigLoader.test.ts`** uses `test/fixtures/config/` files:
- Load valid YAML → returns `RawServerConfig` with correct shape
- Load valid JSON → same
- Unsupported extension → descriptive error with path
- Missing file → descriptive error with path
- Malformed YAML → descriptive error with path
- Malformed JSON → descriptive error with path

**`SpecMapper.test.ts`** — pure unit tests, no file I/O:
- Named server selection — found and missing
- All optional fields default correctly
- Valid string enum values map to typed constants
- Invalid enum strings throw descriptive errors (for each enum: deliveryMode, overflowAction, transport, engineIoTransport, auth)
- TLS block present → `TlsConfig` created
- Duplicate namespace paths rejected
- `NamespaceSpec` validation errors propagate (e.g. AT_LEAST_ONCE + wrong overflow)

**`StreamFenceServerBuilder.fromConfig.test.ts`**:
- `fromYaml` round-trip: loaded spec values match expected
- `fromJson` round-trip: same
- Further `.listener()` / `.metrics()` call after `fromYaml` overrides correctly
- `fromYaml` with zero namespaces in config → `buildServer()` throws

**Fixture files:**
- `streamfence.valid.yaml` — two servers (`feed` + `control`), all optional fields set
- `streamfence.minimal.yaml` — two servers, only `port`, `namespaces[].path`, `namespaces[].topics` set
- `streamfence.valid.json` — same structure as valid YAML in JSON format
- `streamfence.invalid.yaml` — syntactically broken (e.g. bad indentation / unclosed string)

---

## 12. Dependencies

```json
"dependencies": {
  "yaml": "^2.4.1"
},
"devDependencies": {
  "tsx": "^4.7.2"
}
```

`yaml` is a runtime dependency because `ServerConfigLoader` is called at server startup in production. `tsx` is dev-only — only needed to run examples locally.
