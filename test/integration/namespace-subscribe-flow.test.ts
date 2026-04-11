import { afterEach, describe, expect, it } from 'vitest';
import { io as connectClient, type Socket } from 'socket.io-client';
import { DeliveryMode } from '../../src/DeliveryMode.js';
import { OverflowAction } from '../../src/OverflowAction.js';
import { NoopServerMetrics } from '../../src/ServerMetrics.js';
import { AckTracker } from '../../src/internal/delivery/AckTracker.js';
import { ClientSessionRegistry } from '../../src/internal/delivery/ClientSessionRegistry.js';
import { RetryService } from '../../src/internal/delivery/RetryService.js';
import { TopicDispatcher } from '../../src/internal/delivery/TopicDispatcher.js';
import { TopicRegistry } from '../../src/internal/delivery/TopicRegistry.js';
import { TopicPolicy } from '../../src/internal/config/TopicPolicy.js';
import { NamespaceHandler } from '../../src/internal/transport/NamespaceHandler.js';
import { SocketServerBootstrap } from '../../src/internal/transport/SocketServerBootstrap.js';
import { EngineIoTransportMode } from '../../src/EngineIoTransportMode.js';

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

describe('namespace subscribe flow', () => {
  let bootstrap: SocketServerBootstrap | undefined;
  let client: Socket | undefined;

  afterEach(async () => {
    if (client !== undefined && client.connected) {
      client.disconnect();
    }
    if (bootstrap !== undefined) {
      await bootstrap.stop();
    }
  });

  it('tracks subscribe/unsubscribe and disconnect cleanup', async () => {
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

    client = connectClient(`http://127.0.0.1:${bootstrap.port}/feed`, {
      transports: ['websocket'],
      reconnection: false,
    });

    await new Promise<void>((resolve) => client!.once('connect', () => resolve()));

    client.emit('subscribe', { topic: 'snapshot', token: null });
    await waitForTick();

    expect(sessionRegistry.subscribersOf('/feed', 'snapshot').map((s) => s.clientId)).toEqual([
      client.id,
    ]);

    client.emit('unsubscribe', { topic: 'snapshot', token: null });
    await waitForTick();

    expect(sessionRegistry.subscribersOf('/feed', 'snapshot')).toEqual([]);

    client.disconnect();
    await waitForTick();

    expect(sessionRegistry.get(client.id)).toBeUndefined();

    dispatcher.close();
    handler.stop();
  });
});

async function waitForTick(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 10));
}
