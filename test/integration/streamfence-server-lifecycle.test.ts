import { afterEach, describe, expect, it } from 'vitest';
import { io as connectClient, type Socket } from 'socket.io-client';
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

  it('starts, serves metrics, publishes, and stops', async () => {
    const metrics = new PromServerMetrics();

    server = new StreamFenceServerBuilder()
      .host('127.0.0.1')
      .port(0)
      .managementPort(0)
      .metrics(metrics)
      .namespace(NamespaceSpec.builder('/feed').topic('snapshot').build())
      .buildServer();

    await server.start();

    expect(server.port).not.toBeNull();
    expect(server.managementPort).not.toBeNull();

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

    const metricsResponse = await fetch(`http://127.0.0.1:${server.managementPort}/metrics`);
    const metricsBody = await metricsResponse.text();

    expect(metricsResponse.status).toBe(200);
    expect(metricsBody).toContain('streamfence_messages_published_total');
    expect(metricsBody).toContain('namespace="/feed"');
    expect(metricsBody).toContain('topic="snapshot"');
  });
});

async function delay(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}
