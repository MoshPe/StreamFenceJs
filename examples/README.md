# StreamFenceJs Examples

These examples import directly from `src/` and are run via `tsx` — no build step needed.

## Prerequisites

```bash
npm install   # install all dependencies including tsx
```

## Mixed Workload

Demonstrates two servers from a single YAML config file: a high-frequency
BEST_EFFORT feed server and a reliable AT_LEAST_ONCE control server.

```bash
# Terminal 1 — start both servers
npx tsx examples/mixed-workload/server.ts

# Terminal 2 — start the client
npx tsx examples/mixed-workload/client.ts
```

## Single Server (Programmatic API)

Demonstrates the programmatic builder API with one namespace and no config file.

```bash
# Terminal 1
npx tsx examples/single-server/server.ts

# Terminal 2
npx tsx examples/single-server/client.ts
```
