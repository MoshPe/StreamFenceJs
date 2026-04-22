/**
 * Multi-namespace example — one server with three namespaces, each using a
 * different overflow policy and delivery mode.
 *
 * Run:  npx tsx examples/multi-namespace/server.ts
 *
 * Imports directly from src/ for dev-run mode (no build step needed).
 * In production, import from 'streamfence-js' instead.
 */
import { StreamFenceServerBuilder } from '../../src/StreamFenceServerBuilder.js';
import { NamespaceSpec } from '../../src/NamespaceSpec.js';
import { DeliveryMode } from '../../src/DeliveryMode.js';
import { OverflowAction } from '../../src/OverflowAction.js';
import { Registry } from 'prom-client';
import { PromServerMetrics } from '../../src/PromServerMetrics.js';
import type { ServerEventListener } from '../../src/ServerEventListener.js';

// ── Event listener for observability ─────────────────────────────────────────

const listener: ServerEventListener = {
  onServerStarted(event) {
    console.log(`Server started on ${event.host}:${event.port}`);
  },
  onClientConnected(event) {
    console.log(`[${event.namespace}] client connected: ${event.clientId} (${event.transport})`);
  },
  onClientDisconnected(event) {
    console.log(`[${event.namespace}] client disconnected: ${event.clientId}`);
  },
  onSubscribed(event) {
    console.log(`[${event.namespace}] ${event.clientId} subscribed to ${event.topic}`);
  },
  onQueueOverflow(event) {
    console.warn(`[${event.namespace}] overflow on ${event.topic}: ${event.reason}`);
  },
  onPublishRejected(event) {
    console.warn(`[${event.namespace}] rejected for ${event.clientId}: ${event.reasonCode} — ${event.reason}`);
  },
};

// ── Namespace 1: /prices — fast ticker with DROP_OLDEST ──────────────────────

const pricesSpec = NamespaceSpec.builder('/prices')
  .topics(['bid', 'ask'])
  .deliveryMode(DeliveryMode.BEST_EFFORT)
  .overflowAction(OverflowAction.DROP_OLDEST)
  .maxQueuedMessagesPerClient(16)
  .build();

// ── Namespace 2: /snapshots — only the latest value matters ──────────────────

const snapshotsSpec = NamespaceSpec.builder('/snapshots')
  .topic('portfolio')
  .deliveryMode(DeliveryMode.BEST_EFFORT)
  .overflowAction(OverflowAction.SNAPSHOT_ONLY)
  .maxQueuedMessagesPerClient(1)
  .build();

// ── Namespace 3: /alerts — reliable delivery with retries ────────────────────

const alertsSpec = NamespaceSpec.builder('/alerts')
  .topic('critical')
  .topic('info')
  .deliveryMode(DeliveryMode.AT_LEAST_ONCE)
  .overflowAction(OverflowAction.REJECT_NEW)
  .maxQueuedMessagesPerClient(64)
  .maxRetries(3)
  .ackTimeoutMs(2000)
  .maxInFlight(4)
  .build();

// ── Build and start ──────────────────────────────────────────────────────────

const registry = new Registry();

const server = new StreamFenceServerBuilder()
  .port(3000)
  .metrics(new PromServerMetrics(registry))
  .listener(listener)
  .namespace(pricesSpec)
  .namespace(snapshotsSpec)
  .namespace(alertsSpec)
  .buildServer();

await server.start();

console.log('Namespaces:');
console.log('  /prices     — BEST_EFFORT, DROP_OLDEST (bid, ask)');
console.log('  /snapshots  — BEST_EFFORT, SNAPSHOT_ONLY (portfolio)');
console.log('  /alerts     — AT_LEAST_ONCE, REJECT_NEW (critical, info)');
console.log('Press Ctrl+C to stop.\n');

// ── Simulate publishing ──────────────────────────────────────────────────────

let tick = 0;

// Prices: rapid bid/ask updates every 200ms
const priceInterval = setInterval(() => {
  const mid = 100 + Math.sin(tick / 10) * 5;
  server.publish('/prices', 'bid', { price: (mid - 0.01).toFixed(2), tick });
  server.publish('/prices', 'ask', { price: (mid + 0.01).toFixed(2), tick });
  tick++;
}, 200);

// Snapshots: portfolio snapshot every 2s
const snapshotInterval = setInterval(() => {
  server.publish('/snapshots', 'portfolio', {
    totalValue: (50_000 + Math.random() * 1_000).toFixed(2),
    positions: 12,
    updatedAt: new Date().toISOString(),
  });
}, 2000);

// Alerts: occasional critical alert every 10s
const alertInterval = setInterval(() => {
  server.publish('/alerts', 'critical', {
    level: 'CRITICAL',
    message: 'Margin call threshold reached',
    ts: Date.now(),
  });
}, 10_000);

process.on('SIGINT', async () => {
  clearInterval(priceInterval);
  clearInterval(snapshotInterval);
  clearInterval(alertInterval);
  await server.stop();
  console.log('\nServer stopped.');
  process.exit(0);
});
