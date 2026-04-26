/**
 * SPILL_TO_DISK example — AT_LEAST_ONCE delivery with disk-backed overflow.
 *
 * Demonstrates a burst-publish scenario: 20 order events are published faster
 * than the client's queue can absorb them. Messages that exceed the in-memory
 * queue limit spill to disk and are replayed transparently once the client drains
 * its backlog. No message is lost even under heavy load.
 *
 * Run:  npx tsx examples/spill-to-disk/server.ts
 *
 * Imports directly from src/ for dev-run mode (no build step needed).
 * In production, import from 'streamfence-js' instead.
 */
import { StreamFenceServerBuilder } from '../../src/StreamFenceServerBuilder.js';
import { NamespaceSpec } from '../../src/NamespaceSpec.js';
import { DeliveryMode } from '../../src/DeliveryMode.js';
import { OverflowAction } from '../../src/OverflowAction.js';
import type { ServerEventListener } from '../../src/ServerEventListener.js';

// ── Event listener ────────────────────────────────────────────────────────────

const listener: ServerEventListener = {
  onServerStarted(event) {
    console.log(`[server] started on ${event.host}:${event.port}`);
  },
  onClientConnected(event) {
    console.log(`[server] client connected: ${event.clientId}`);
  },
  onClientDisconnected(event) {
    console.log(`[server] client disconnected: ${event.clientId}`);
  },
  onSubscribed(event) {
    console.log(`[server] ${event.clientId} subscribed to ${event.topic}`);
  },
  onQueueOverflow(event) {
    // Fires when a message cannot fit in the in-memory queue and is spilled
    console.log(`[server] overflow — spilling to disk: ${event.topic} (${event.reason})`);
  },
  onRetry(event) {
    console.log(`[server] retrying ${event.messageId} for ${event.clientId} (attempt ${event.retryCount})`);
  },
  onRetryExhausted(event) {
    console.warn(`[server] retry exhausted: ${event.messageId} after ${event.retryCount} attempts`);
  },
};

// ── Namespace: /orders — AT_LEAST_ONCE + SPILL_TO_DISK ───────────────────────
//
// Key settings:
//   maxQueuedMessagesPerClient: 4  — small in-memory queue to trigger spill quickly
//   overflowAction: SPILL_TO_DISK  — excess messages go to disk, not dropped
//   maxRetries: 5                  — up to 5 re-sends if client misses an ack
//   ackTimeoutMs: 2000             — 2-second window for the client to ack
//   spillRootPath: './.spill'      — where disk files are written

const ordersSpec = NamespaceSpec.builder('/orders')
  .topic('new')
  .deliveryMode(DeliveryMode.AT_LEAST_ONCE)
  .overflowAction(OverflowAction.SPILL_TO_DISK)
  .maxQueuedMessagesPerClient(4)
  .maxInFlight(2)
  .maxRetries(5)
  .ackTimeoutMs(2000)
  .build();

const server = new StreamFenceServerBuilder()
  .port(3001)
  .spillRootPath('./.spill')
  .listener(listener)
  .namespace(ordersSpec)
  .buildServer();

await server.start();

console.log('\n[server] Publishing 20 orders in rapid succession...');
console.log('[server] In-memory queue holds 4 messages — the rest spill to disk.\n');

// Burst-publish 20 orders. Only 4 fit in the in-memory queue; the rest spill.
for (let i = 1; i <= 20; i++) {
  server.publish('/orders', 'new', {
    orderId: `ORD-${String(i).padStart(4, '0')}`,
    amount: (Math.random() * 1000).toFixed(2),
    currency: 'USD',
    ts: Date.now(),
  });
}

console.log('[server] All 20 orders published. Spilled messages will replay as the client drains.\n');
console.log('Press Ctrl+C to stop.\n');

process.on('SIGINT', async () => {
  await server.stop();
  console.log('\n[server] stopped.');
  process.exit(0);
});
