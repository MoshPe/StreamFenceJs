# StreamFenceJs Remaining Roadmap

## Current Baseline

- Branch baseline: `dev`
- Completed plan: `docs/superpowers/plans/2026-04-10-streamfencejs-foundation.md`
- Current status: Plan 1 is implemented, tested, and merged; the repo already ships the public enums, core value objects, `NamespaceSpec`, listener/event types, metrics interface stub, and internal wire-protocol records.
- Remaining delivery target: finish a full v1 library, not just the mixed-workload slice.

## Execution Order

1. Delivery Engine
2. Transport and Server Assembly
3. Polish and Publish Readiness

This order is mandatory. The transport/server work must not begin until the queueing, retry, overflow, spill, registry, and metrics core is fully unit-tested and stable. The polish plan must not start until the public server surface and integration behavior are already green.

## Product Decisions Locked For The Remaining Work

- `DeliveryMode` remains `BEST_EFFORT | AT_LEAST_ONCE`.
- `TransportMode` remains `WS | WSS`; Socket.IO transport selection is modeled separately at server level.
- Topic delivery is explicit-subscription based. A publish only targets clients subscribed to that topic.
- `AT_LEAST_ONCE` retries use fixed delay equal to `ackTimeoutMs`.
- `OverflowAction.SPILL_TO_DISK` is implemented in v1 with a built-in local-filesystem spill backend only.
- `AuthMode.TOKEN` checks `socket.handshake.auth.token` first, then `Authorization: Bearer ...`.
- Client -> server reliable ack behavior is namespace-configurable, with default `ACK_ON_RECEIPT`.
- Observability includes both programmatic hooks and an optional dedicated management HTTP server on a separate port.
- TLS PEM hot reload is in scope for v1.

## Recommended Deployment Guidance

The docs and examples should make the mixed-workload split official:

- Run a feed server for heavy high-frequency best-effort broadcasts.
- Run a control server for lightweight reliable traffic.
- Keep them on separate ports, even inside one Node.js process.

This remains the recommended operating model for workloads like `500KB x 100 clients x every 500ms` plus reliable control traffic.

## Deliverables

- `docs/superpowers/plans/2026-04-10-streamfencejs-delivery-engine.md`
- `docs/superpowers/plans/2026-04-10-streamfencejs-transport-server.md`
- `docs/superpowers/plans/2026-04-10-streamfencejs-polish.md`

Each plan is execution-grade and assumes the implementer starts from the current Plan 1 baseline on `dev`.
