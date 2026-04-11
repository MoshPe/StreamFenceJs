import { afterEach, describe, expect, it } from 'vitest';
import { io as connectClient, type Socket } from 'socket.io-client';
import { DeliveryMode } from '../../src/DeliveryMode.js';
import { OverflowAction } from '../../src/OverflowAction.js';
import { EngineIoTransportMode } from '../../src/EngineIoTransportMode.js';
import { NoopServerMetrics } from '../../src/ServerMetrics.js';
import type { TopicPolicy } from '../../src/internal/config/TopicPolicy.js';
import { AckTracker } from '../../src/internal/delivery/AckTracker.js';
import { ClientSessionRegistry } from '../../src/internal/delivery/ClientSessionRegistry.js';
import { RetryService } from '../../src/internal/delivery/RetryService.js';
import { TopicDispatcher } from '../../src/internal/delivery/TopicDispatcher.js';
import { TopicRegistry } from '../../src/internal/delivery/TopicRegistry.js';
import { NamespaceHandler } from '../../src/internal/transport/NamespaceHandler.js';
import { SocketServerBootstrap } from '../../src/internal/transport/SocketServerBootstrap.js';

function policy(topic: string): TopicPolicy {
  return Object.freeze({
    namespace: '/feed',
    topic,
    deliveryMode: DeliveryMode.BEST_EFFORT,
    overflowAction: OverflowAction.REJECT_NEW,
    maxQueuedMessagesPerClient: 10,
    maxQueuedBytesPerClient: 1024 * 128,
    ackTimeoutMs: 100,
    maxRetries: 1,
    coalesce: false,
    allowPolling: true,
    maxInFlight: 1,
  });
}

describe('publish delivery flow', () => {
  let bootstrap: SocketServerBootstrap | undefined;
  let subscribedClient: Socket | undefined;
  let unsubscribedClient: Socket | undefined;

  afterEach(async () => {
    subscribedClient?.disconnect();
    unsubscribedClient?.disconnect();
    if (bootstrap !== undefined) {
      await bootstrap.stop();
    }
  });

  it('delivers only to subscribed clients', async () => {
    bootstrap = new SocketServerBootstrap({
      host: '127.0.0.1',
      port: 0,
      engineIoTransportMode: EngineIoTransportMode.WEBSOCKET_ONLY,
    });
    await bootstrap.start();

    const topicRegistry = new TopicRegistry();
    topicRegistry.register(policy('snapshot'));

    const sessionRegistry = new ClientSessionRegistry();
    const dispatcher = new TopicDispatcher({
      topicRegistry,
      sessionRegistry,
      ackTracker: new AckTracker(),
      retryService: new RetryService(new AckTracker(), 1000),
      metrics: new NoopServerMetrics(),
    });

    const namespace = bootstrap.ioServer.of('/feed');
    const handler = new NamespaceHandler({
      namespacePath: '/feed',
      ioNamespace: namespace,
      topicRegistry,
      sessionRegistry,
      dispatcher,
    });
    handler.start();

    subscribedClient = connectClient(`http://127.0.0.1:${bootstrap.port}/feed`, {
      transports: ['websocket'],
      reconnection: false,
    });
    unsubscribedClient = connectClient(`http://127.0.0.1:${bootstrap.port}/feed`, {
      transports: ['websocket'],
      reconnection: false,
    });

    await Promise.all([
      new Promise<void>((resolve) => subscribedClient!.once('connect', () => resolve())),
      new Promise<void>((resolve) => unsubscribedClient!.once('connect', () => resolve())),
    ]);

    subscribedClient.emit('subscribe', { topic: 'snapshot', token: null });
    await waitForTick();

    const received = new Promise<unknown>((resolve) => {
      subscribedClient!.once('snapshot', (payload: unknown) => resolve(payload));
    });

    let unexpected = false;
    unsubscribedClient.once('snapshot', () => {
      unexpected = true;
    });

    dispatcher.publish('/feed', 'snapshot', { value: 42 });

    await expect(received).resolves.toEqual({ value: 42 });
    await waitForTick();
    expect(unexpected).toBe(false);

    dispatcher.close();
    handler.stop();
  });
});

async function waitForTick(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 10));
}
