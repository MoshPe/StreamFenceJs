/**
 * Single-server example — programmatic builder API, no config file.
 *
 * Run:  npx tsx examples/single-server/server.ts
 *
 * Imports directly from src/ for dev-run mode (no build step needed).
 * In production, import from 'streamfence-js' instead.
 */
import { StreamFenceServerBuilder } from '../../src/StreamFenceServerBuilder.js';
import { NamespaceSpec } from '../../src/NamespaceSpec.js';
import { DeliveryMode } from '../../src/DeliveryMode.js';
import { OverflowAction } from '../../src/OverflowAction.js';

const feedSpec = NamespaceSpec.builder('/feed')
  .topic('snapshot')
  .deliveryMode(DeliveryMode.BEST_EFFORT)
  .overflowAction(OverflowAction.DROP_OLDEST)
  .maxQueuedMessagesPerClient(128)
  .build();

const server = new StreamFenceServerBuilder()
  .port(3000)
  .namespace(feedSpec)
  .buildServer();

await server.start();
console.log(`Server listening on port ${server.port}`);
console.log('Press Ctrl+C to stop.');

let tick = 0;
const publishInterval = setInterval(() => {
  server.publish('/feed', 'snapshot', { price: (100 + Math.random()).toFixed(2), tick });
  tick++;
}, 500);

process.on('SIGINT', async () => {
  clearInterval(publishInterval);
  await server.stop();
  console.log('\nServer stopped.');
  process.exit(0);
});
