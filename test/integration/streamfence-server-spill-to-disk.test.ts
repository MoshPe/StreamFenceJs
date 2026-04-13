import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { io as connectClient, type Socket } from 'socket.io-client';
import { NamespaceSpec } from '../../src/NamespaceSpec.js';
import { OverflowAction } from '../../src/OverflowAction.js';
import { PromServerMetrics } from '../../src/PromServerMetrics.js';
import { StreamFenceServerBuilder } from '../../src/StreamFenceServerBuilder.js';

describe('streamfence spill to disk', () => {
  let server = new StreamFenceServerBuilder()
    .namespace(NamespaceSpec.builder('/feed').topic('snapshot').build())
    .buildServer();
  let client: Socket | undefined;
  let spillRoot: string | undefined;

  afterEach(async () => {
    client?.disconnect();
    await server.stop();
    if (spillRoot !== undefined) {
      rmSync(spillRoot, { force: true, recursive: true });
      spillRoot = undefined;
    }
  });

  it('replays spilled messages to real clients and records overflow metrics', async () => {
    spillRoot = mkdtempSync(join(tmpdir(), 'streamfence-server-spill-'));
    const metrics = new PromServerMetrics();

    server = new StreamFenceServerBuilder()
      .host('127.0.0.1')
      .port(0)
      .spillRootPath(spillRoot)
      .metrics(metrics)
      .namespace(
        NamespaceSpec.builder('/feed')
          .topic('snapshot')
          .overflowAction(OverflowAction.SPILL_TO_DISK)
          .maxQueuedMessagesPerClient(1)
          .build(),
      )
      .buildServer();

    await server.start();

    client = connectClient(`http://127.0.0.1:${server.port}/feed`, {
      transports: ['websocket'],
      reconnection: false,
    });

    await new Promise<void>((resolve) => client!.once('connect', () => resolve()));
    client.emit('subscribe', { topic: 'snapshot', token: null });
    await delay(20);

    const received: unknown[] = [];
    client.on('snapshot', (payload: unknown) => {
      received.push(payload);
    });

    server.publish('/feed', 'snapshot', { value: 1 });
    server.publish('/feed', 'snapshot', { value: 2 });
    server.publish('/feed', 'snapshot', { value: 3 });

    const spillDir = join(spillRoot, 'feed', client.id!, 'snapshot');
    expect(spillFiles(spillDir)).toHaveLength(2);

    await waitFor(() => received.length === 3);

    expect(received).toEqual([{ value: 1 }, { value: 2 }, { value: 3 }]);
    expect(metrics.scrape()).toContain('streamfence_queue_overflow_total');
    expect(metrics.scrape()).toContain('reason="spilled to disk"');
  });

  it('purges spill files when the server stops before queued spill is drained', async () => {
    spillRoot = mkdtempSync(join(tmpdir(), 'streamfence-server-spill-stop-'));

    server = new StreamFenceServerBuilder()
      .host('127.0.0.1')
      .port(0)
      .spillRootPath(spillRoot)
      .namespace(
        NamespaceSpec.builder('/feed')
          .topic('snapshot')
          .overflowAction(OverflowAction.SPILL_TO_DISK)
          .maxQueuedMessagesPerClient(1)
          .build(),
      )
      .buildServer();

    await server.start();

    client = connectClient(`http://127.0.0.1:${server.port}/feed`, {
      transports: ['websocket'],
      reconnection: false,
    });

    await new Promise<void>((resolve) => client!.once('connect', () => resolve()));
    client.emit('subscribe', { topic: 'snapshot', token: null });
    await delay(20);

    server.publish('/feed', 'snapshot', { value: 1 });
    server.publish('/feed', 'snapshot', { value: 2 });
    server.publish('/feed', 'snapshot', { value: 3 });

    const spillDir = join(spillRoot, 'feed', client.id!, 'snapshot');
    expect(spillFiles(spillDir)).toHaveLength(2);

    await server.stop();

    expect(spillFiles(spillDir)).toEqual([]);
  });
});

function spillFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir).filter((file) => file.endsWith('.json'));
}

async function delay(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate: () => boolean, timeoutMs: number = 1000): Promise<void> {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error(`Timed out after ${timeoutMs}ms`);
    }
    await delay(10);
  }
}
