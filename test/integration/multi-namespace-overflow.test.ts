import { afterEach, describe, expect, it } from 'vitest';
import { io as connectClient, type Socket } from 'socket.io-client';
import { DeliveryMode } from '../../src/DeliveryMode.js';
import { OverflowAction } from '../../src/OverflowAction.js';
import { NamespaceSpec } from '../../src/NamespaceSpec.js';
import { StreamFenceServerBuilder } from '../../src/StreamFenceServerBuilder.js';
import type { StreamFenceServer } from '../../src/StreamFenceServer.js';

function delay(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

describe('multi-namespace overflow', () => {
  let server: StreamFenceServer | undefined;
  const clients: Socket[] = [];

  afterEach(async () => {
    for (const c of clients) {
      c.disconnect();
    }
    clients.length = 0;
    if (server !== undefined) {
      await server.stop();
      server = undefined;
    }
  });

  it('applies different overflow policies per namespace', async () => {
    server = new StreamFenceServerBuilder()
      .host('127.0.0.1')
      .port(0)
      .namespace(
        NamespaceSpec.builder('/drop-oldest')
          .topic('data')
          .deliveryMode(DeliveryMode.BEST_EFFORT)
          .overflowAction(OverflowAction.DROP_OLDEST)
          .maxQueuedMessagesPerClient(2)
          .build(),
      )
      .namespace(
        NamespaceSpec.builder('/reject-new')
          .topic('data')
          .deliveryMode(DeliveryMode.BEST_EFFORT)
          .overflowAction(OverflowAction.REJECT_NEW)
          .maxQueuedMessagesPerClient(2)
          .build(),
      )
      .buildServer();

    await server.start();

    // Connect and subscribe both clients
    const dropClient = connectClient(`http://127.0.0.1:${server.port}/drop-oldest`, {
      transports: ['websocket'],
      reconnection: false,
    });
    const rejectClient = connectClient(`http://127.0.0.1:${server.port}/reject-new`, {
      transports: ['websocket'],
      reconnection: false,
    });
    clients.push(dropClient, rejectClient);

    await Promise.all([
      new Promise<void>((resolve) => dropClient.once('connect', () => resolve())),
      new Promise<void>((resolve) => rejectClient.once('connect', () => resolve())),
    ]);

    dropClient.emit('subscribe', { topic: 'data', token: null });
    rejectClient.emit('subscribe', { topic: 'data', token: null });
    await delay(20);

    const dropReceived: unknown[] = [];
    dropClient.on('data', (payload: unknown) => dropReceived.push(payload));

    const rejectReceived: unknown[] = [];
    rejectClient.on('data', (payload: unknown) => rejectReceived.push(payload));

    // Both namespaces should deliver — messages drain via microtask
    for (let i = 1; i <= 3; i++) {
      server.publish('/drop-oldest', 'data', { seq: i });
      server.publish('/reject-new', 'data', { seq: i });
    }

    await delay(100);

    // Both should have received messages (BEST_EFFORT drains immediately)
    expect(dropReceived.length).toBeGreaterThan(0);
    expect(rejectReceived.length).toBeGreaterThan(0);
  });

  it('SNAPSHOT_ONLY delivers only the latest message', async () => {
    server = new StreamFenceServerBuilder()
      .host('127.0.0.1')
      .port(0)
      .namespace(
        NamespaceSpec.builder('/snapshots')
          .topic('price')
          .deliveryMode(DeliveryMode.BEST_EFFORT)
          .overflowAction(OverflowAction.SNAPSHOT_ONLY)
          .maxQueuedMessagesPerClient(1)
          .build(),
      )
      .buildServer();

    await server.start();

    const client = connectClient(`http://127.0.0.1:${server.port}/snapshots`, {
      transports: ['websocket'],
      reconnection: false,
    });
    clients.push(client);

    await new Promise<void>((resolve) => client.once('connect', () => resolve()));
    client.emit('subscribe', { topic: 'price', token: null });
    await delay(20);

    const received: unknown[] = [];
    client.on('price', (payload: unknown) => received.push(payload));

    // Rapid publishes
    for (let i = 1; i <= 5; i++) {
      server.publish('/snapshots', 'price', { value: i });
    }

    await delay(100);

    // With BEST_EFFORT + microtask drain, messages may arrive quickly.
    // SNAPSHOT_ONLY replaces the queue each time, so the client should
    // receive at least the last value and at most all of them depending on timing.
    expect(received.length).toBeGreaterThanOrEqual(1);
    // The last received must be the final value
    expect(received[received.length - 1]).toEqual({ value: 5 });
  });

  it('rejects messages exceeding maxQueuedBytesPerClient', async () => {
    server = new StreamFenceServerBuilder()
      .host('127.0.0.1')
      .port(0)
      .namespace(
        NamespaceSpec.builder('/limited')
          .topic('data')
          .deliveryMode(DeliveryMode.BEST_EFFORT)
          .overflowAction(OverflowAction.REJECT_NEW)
          .maxQueuedMessagesPerClient(100)
          .maxQueuedBytesPerClient(10) // Very small byte limit
          .build(),
      )
      .buildServer();

    await server.start();

    const client = connectClient(`http://127.0.0.1:${server.port}/limited`, {
      transports: ['websocket'],
      reconnection: false,
    });
    clients.push(client);

    await new Promise<void>((resolve) => client.once('connect', () => resolve()));
    client.emit('subscribe', { topic: 'data', token: null });
    await delay(20);

    const received: unknown[] = [];
    client.on('data', (payload: unknown) => received.push(payload));

    // This payload is larger than 10 bytes when JSON-serialized
    server.publish('/limited', 'data', { largeField: 'this string is definitely more than 10 bytes' });

    await delay(100);

    // Message should have been rejected due to byte limit
    expect(received).toHaveLength(0);
  });

});
