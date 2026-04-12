import { afterEach, describe, expect, it } from 'vitest';
import { io as connectClient, type Socket } from 'socket.io-client';
import { NamespaceSpec } from '../../src/NamespaceSpec.js';
import { StreamFenceServerBuilder } from '../../src/StreamFenceServerBuilder.js';

describe('streamfence publishTo', () => {
  let server = new StreamFenceServerBuilder()
    .namespace(NamespaceSpec.builder('/feed').topic('snapshot').build())
    .buildServer();
  let firstClient: Socket | undefined;
  let secondClient: Socket | undefined;

  afterEach(async () => {
    firstClient?.disconnect();
    secondClient?.disconnect();
    await server.stop();
  });

  it('delivers only to the targeted subscribed client', async () => {
    server = new StreamFenceServerBuilder()
      .host('127.0.0.1')
      .port(0)
      .namespace(NamespaceSpec.builder('/feed').topic('snapshot').build())
      .buildServer();

    await server.start();

    firstClient = connectClient(`http://127.0.0.1:${server.port}/feed`, {
      transports: ['websocket'],
      reconnection: false,
    });
    secondClient = connectClient(`http://127.0.0.1:${server.port}/feed`, {
      transports: ['websocket'],
      reconnection: false,
    });

    await Promise.all([
      new Promise<void>((resolve) => firstClient!.once('connect', () => resolve())),
      new Promise<void>((resolve) => secondClient!.once('connect', () => resolve())),
    ]);

    firstClient.emit('subscribe', { topic: 'snapshot', token: null });
    secondClient.emit('subscribe', { topic: 'snapshot', token: null });
    await delay(20);

    const receivedByFirst = new Promise<unknown>((resolve) => {
      firstClient!.once('snapshot', (payload: unknown) => resolve(payload));
    });

    let secondReceived = false;
    secondClient.once('snapshot', () => {
      secondReceived = true;
    });

    const firstClientId = firstClient.id;
    expect(firstClientId).toBeDefined();
    if (firstClientId === undefined) {
      throw new Error('first client id should be defined after connect');
    }

    server.publishTo('/feed', firstClientId, 'snapshot', { value: 99 });

    await expect(receivedByFirst).resolves.toEqual({ value: 99 });
    await delay(30);
    expect(secondReceived).toBe(false);
  });
});

async function delay(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}
