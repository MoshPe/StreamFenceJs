import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { io as connectClient, type Socket } from 'socket.io-client';
import { DeliveryMode } from '../../src/DeliveryMode.js';
import { OverflowAction } from '../../src/OverflowAction.js';
import { NamespaceSpec } from '../../src/NamespaceSpec.js';
import { StreamFenceServerBuilder } from '../../src/StreamFenceServerBuilder.js';

function buildReliableSpillServer(spillRoot: string, extra?: { maxQueuedMessagesPerClient?: number; maxRetries?: number; ackTimeoutMs?: number }) {
  return new StreamFenceServerBuilder()
    .host('127.0.0.1')
    .port(0)
    .spillRootPath(spillRoot)
    .namespace(
      NamespaceSpec.builder('/alerts')
        .topic('order')
        .deliveryMode(DeliveryMode.AT_LEAST_ONCE)
        .overflowAction(OverflowAction.SPILL_TO_DISK)
        .maxQueuedMessagesPerClient(extra?.maxQueuedMessagesPerClient ?? 1)
        .maxInFlight(1)
        .maxRetries(extra?.maxRetries ?? 5)
        .ackTimeoutMs(extra?.ackTimeoutMs ?? 200)
        .build(),
    )
    .buildServer();
}

describe('AT_LEAST_ONCE + SPILL_TO_DISK', () => {
  let server = new StreamFenceServerBuilder()
    .namespace(NamespaceSpec.builder('/alerts').topic('order').build())
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

  it('spills overflow messages to disk and delivers + retries them reliably', async () => {
    spillRoot = mkdtempSync(join(tmpdir(), 'streamfence-alo-spill-'));

    server = new StreamFenceServerBuilder()
      .host('127.0.0.1')
      .port(0)
      .spillRootPath(spillRoot)
      .namespace(
        NamespaceSpec.builder('/alerts')
          .topic('order')
          .deliveryMode(DeliveryMode.AT_LEAST_ONCE)
          .overflowAction(OverflowAction.SPILL_TO_DISK)
          .maxQueuedMessagesPerClient(1)
          .maxInFlight(1)
          .maxRetries(5)
          .ackTimeoutMs(200)
          .build(),
      )
      .buildServer();

    await server.start();

    client = connectClient(`http://127.0.0.1:${server.port}/alerts`, {
      transports: ['websocket'],
      reconnection: false,
    });

    await new Promise<void>((resolve) => client!.once('connect', () => resolve()));
    client.emit('subscribe', { topic: 'order', token: null });
    await delay(20);

    // publish 2 messages — second spills because maxQueuedMessagesPerClient=1
    server.publish('/alerts', 'order', { id: 1 });
    server.publish('/alerts', 'order', { id: 2 });

    const received: Array<{ payload: unknown; messageId: string }> = [];

    client.on('order', (payload: unknown, metadata: { messageId: string; topic: string; ackRequired: boolean }) => {
      received.push({ payload, messageId: metadata.messageId });
      if (metadata.ackRequired) {
        client!.emit('ack', {
          topic: metadata.topic,
          messageId: metadata.messageId,
        });
      }
    });

    // both messages should eventually arrive and be acked
    await waitFor(() => received.length === 2, 3000);

    const ids = received.map((r) => (r.payload as { id: number }).id);
    expect(ids).toContain(1);
    expect(ids).toContain(2);
  });

  it('delivers multiple spilled messages in FIFO order', async () => {
    spillRoot = mkdtempSync(join(tmpdir(), 'streamfence-alo-spill-'));

    server = buildReliableSpillServer(spillRoot, { maxQueuedMessagesPerClient: 1 });
    await server.start();

    client = connectClient(`http://127.0.0.1:${server.port}/alerts`, {
      transports: ['websocket'],
      reconnection: false,
    });

    await new Promise<void>((resolve) => client!.once('connect', () => resolve()));
    client.emit('subscribe', { topic: 'order', token: null });
    await delay(20);

    const receivedIds: number[] = [];

    client.on('order', (payload: { id: number }, metadata: { messageId: string; topic: string; ackRequired: boolean }) => {
      receivedIds.push(payload.id);
      if (metadata.ackRequired) {
        client!.emit('ack', { topic: metadata.topic, messageId: metadata.messageId });
      }
    });

    // Publish 3 messages — first fits in queue, second and third spill
    server.publish('/alerts', 'order', { id: 1 });
    server.publish('/alerts', 'order', { id: 2 });
    server.publish('/alerts', 'order', { id: 3 });

    await waitFor(() => receivedIds.length === 3, 3000);

    // All three IDs must arrive; spill FIFO means order is preserved for spilled messages
    expect(receivedIds).toContain(1);
    expect(receivedIds).toContain(2);
    expect(receivedIds).toContain(3);
    // id:1 (in-memory) must arrive before id:2 and id:3 (spilled)
    expect(receivedIds.indexOf(1)).toBeLessThan(receivedIds.indexOf(2));
    expect(receivedIds.indexOf(2)).toBeLessThan(receivedIds.indexOf(3));
  });

  it('withholds the spilled message until the in-memory message is acked', async () => {
    spillRoot = mkdtempSync(join(tmpdir(), 'streamfence-alo-spill-'));

    // maxRetries=1 so id:1 exhausts quickly once acking is blocked, freeing the slot for id:2
    server = buildReliableSpillServer(spillRoot, { maxRetries: 1, ackTimeoutMs: 150 });
    await server.start();

    client = connectClient(`http://127.0.0.1:${server.port}/alerts`, {
      transports: ['websocket'],
      reconnection: false,
    });

    await new Promise<void>((resolve) => client!.once('connect', () => resolve()));
    client.emit('subscribe', { topic: 'order', token: null });
    await delay(20);

    server.publish('/alerts', 'order', { id: 1 });
    server.publish('/alerts', 'order', { id: 2 });

    const receivedIds: number[] = [];

    // Never ack id:1 — let it exhaust retries so the slot opens for id:2
    client.on('order', (payload: { id: number }, metadata: { messageId: string; topic: string; ackRequired: boolean }) => {
      receivedIds.push(payload.id);
      if (payload.id === 2 && metadata.ackRequired) {
        client!.emit('ack', { topic: metadata.topic, messageId: metadata.messageId });
      }
    });

    // id:2 spilled; only arrives after id:1 exhausts its 1 retry (2 × 150ms = 300ms)
    await waitFor(() => receivedIds.includes(2), 3000);

    expect(receivedIds).toContain(1);
    expect(receivedIds).toContain(2);
    // id:2 must come after at least one delivery of id:1
    expect(receivedIds.indexOf(2)).toBeGreaterThan(0);
  });
});

async function delay(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate: () => boolean, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`waitFor timed out after ${timeoutMs}ms`);
    }
    await delay(10);
  }
}
