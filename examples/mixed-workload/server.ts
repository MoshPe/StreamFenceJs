/**
 * Mixed-workload example — two servers from a single YAML config file.
 *
 * Run:  npx tsx examples/mixed-workload/server.ts
 *
 * Imports directly from src/ for dev-run mode (no build step needed).
 * In production, import from 'streamfence-js' instead.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StreamFenceServerBuilder } from '../../src/StreamFenceServerBuilder.js';

const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);
const configPath = join(__dir, 'streamfence.yaml');

// ── Feed server: high-frequency BEST_EFFORT snapshots ────────────────────────
const feedServer = StreamFenceServerBuilder
  .fromYaml(configPath, { server: 'feed' })
  .buildServer();

// ── Control server: reliable AT_LEAST_ONCE commands ──────────────────────────
const controlServer = StreamFenceServerBuilder
  .fromYaml(configPath, { server: 'control' })
  .buildServer();

await feedServer.start();
await controlServer.start();

console.log(`Feed server    listening on port ${feedServer.port}`);
console.log(`Control server listening on port ${controlServer.port}`);
console.log('Press Ctrl+C to stop.');

// Publish a snapshot every 500 ms to all subscribers of /feed > snapshot
let tick = 0;
const publishInterval = setInterval(() => {
  feedServer.publish('/feed', 'snapshot', { price: (100 + Math.sin(tick / 10) * 5).toFixed(2), tick });
  tick++;
}, 500);

process.on('SIGINT', async () => {
  clearInterval(publishInterval);
  await feedServer.stop();
  await controlServer.stop();
  console.log('\nServers stopped.');
  process.exit(0);
});
