# StreamFenceJs Examples

These examples import directly from `src/` and are run via `tsx` — no build step needed.

## Prerequisites

```bash
npm install   # install all dependencies including tsx
```

## Single Server (Programmatic API)

Demonstrates the programmatic builder API with one namespace and no config file.

```bash
# Terminal 1
npx tsx examples/single-server/server.ts

# Terminal 2
npx tsx examples/single-server/client.ts
```

## Multi-Namespace

Demonstrates a single server with three namespaces, each using a different overflow
policy and delivery mode:

- `/prices` — `BEST_EFFORT` + `DROP_OLDEST` (rapid bid/ask ticker)
- `/snapshots` — `BEST_EFFORT` + `SNAPSHOT_ONLY` (portfolio snapshot)
- `/alerts` — `AT_LEAST_ONCE` + `REJECT_NEW` (reliable critical alerts with ack)

```bash
# Terminal 1 — start the server
npx tsx examples/multi-namespace/server.ts

# Terminal 2 — start the client
npx tsx examples/multi-namespace/client.ts
```

## Spill to Disk

Demonstrates `AT_LEAST_ONCE` delivery with `SPILL_TO_DISK` overflow. The server
burst-publishes 20 orders faster than the client's small in-memory queue (4 slots)
can absorb them. Excess messages are written to a local disk buffer and replayed
transparently as the slow client acks and drains its backlog — zero message loss
even under heavy load.

```bash
# Terminal 1 — start the server (publishes a burst of 20 orders)
npx tsx examples/spill-to-disk/server.ts

# Terminal 2 — start the slow consumer (acks each message after 300ms)
npx tsx examples/spill-to-disk/client.ts
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
