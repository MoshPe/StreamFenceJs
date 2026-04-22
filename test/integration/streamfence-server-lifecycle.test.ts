import { afterEach, describe, expect, it } from 'vitest';
import { io as connectClient, type Socket } from 'socket.io-client';
import { Registry } from 'prom-client';
import { NamespaceSpec } from '../../src/NamespaceSpec.js';
import { PromServerMetrics } from '../../src/PromServerMetrics.js';
import { StreamFenceServerBuilder } from '../../src/StreamFenceServerBuilder.js';

describe('streamfence server lifecycle', () => {
  let server = new StreamFenceServerBuilder()
    .namespace(NamespaceSpec.builder('/feed').topic('snapshot').build())
    .buildServer();
  let client: Socket | undefined;

  afterEach(async () => {
    client?.disconnect();
    await server.stop();
  });

  it('starts, exposes metrics via registry, publishes, and stops', async () => {
    const registry = new Registry();
    const metrics = new PromServerMetrics(registry);

    server = new StreamFenceServerBuilder()
      .host('127.0.0.1')
      .port(0)
      .metrics(metrics)
      .namespace(NamespaceSpec.builder('/feed').topic('snapshot').build())
      .buildServer();

    await server.start();

    expect(server.port).not.toBeNull();

    client = connectClient(`http://127.0.0.1:${server.port}/feed`, {
      transports: ['websocket'],
      reconnection: false,
    });

    await new Promise<void>((resolve) => client!.once('connect', () => resolve()));
    client.emit('subscribe', { topic: 'snapshot', token: null });
    await delay(20);

    const payloadReceived = new Promise<unknown>((resolve) => {
      client!.once('snapshot', (payload: unknown) => resolve(payload));
    });

    server.publish('/feed', 'snapshot', { value: 1 });

    await expect(payloadReceived).resolves.toEqual({ value: 1 });

    const metricsBody = await registry.metrics();

    expect(metricsBody).toContain('streamfence_messages_published_total');
    expect(metricsBody).toContain('namespace="/feed"');
    expect(metricsBody).toContain('topic="snapshot"');
  });
});

async function delay(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}
