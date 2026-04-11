import { afterEach, describe, expect, it } from 'vitest';
import { io as connectClient, type Socket } from 'socket.io-client';
import { DeliveryMode } from '../../src/DeliveryMode.js';
import { OverflowAction } from '../../src/OverflowAction.js';
import { EngineIoTransportMode } from '../../src/EngineIoTransportMode.js';
import { NoopServerMetrics } from '../../src/ServerMetrics.js';
import { TopicPolicy } from '../../src/internal/config/TopicPolicy.js';
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
    deliveryMode: DeliveryMode.AT_LEAST_ONCE,
    overflowAction: OverflowAction.REJECT_NEW,
    maxQueuedMessagesPerClient: 10,
    maxQueuedBytesPerClient: 1024 * 128,
    ackTimeoutMs: 40,
    maxRetries: 1,
    coalesce: false,
    allowPolling: true,
    maxInFlight: 1,
  });
}

describe('reliable delivery retry', () => {
  let bootstrap: SocketServerBootstrap | undefined;
  let client: Socket | undefined;

  afterEach(async () => {
    client?.disconnect();
    if (bootstrap !== undefined) {
      await bootstrap.stop();
    }
  });

  it('retries unacked messages and stops retrying after ack/exhaustion', async () => {
    bootstrap = new SocketServerBootstrap({
      host: '127.0.0.1',
      port: 0,
      engineIoTransportMode: EngineIoTransportMode.WEBSOCKET_ONLY,
    });
    await bootstrap.start();

    const topicRegistry = new TopicRegistry();
    topicRegistry.register(policy('snapshot'));

    const sessionRegistry = new ClientSessionRegistry();
    const ackTracker = new AckTracker();
    const dispatcher = new TopicDispatcher({
      topicRegistry,
      sessionRegistry,
      ackTracker,
      retryService: new RetryService(ackTracker, 1000),
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
    await waitFor(
      () => sessionRegistry.subscribersOf('/feed', 'snapshot').length === 1,
      500,
    );

    let receivedCount = 0;
    client.on('snapshot', () => {
      receivedCount += 1;
    });

    dispatcher.publish('/feed', 'snapshot', { value: 1 });
    await waitFor(() => receivedCount >= 1, 300);

    await delay(60);
    dispatcher.processRetries();
    await waitFor(() => receivedCount >= 2, 300);

    const messageId = sessionRegistry.get(client.id)?.lane('snapshot')?.peek()?.messageId;
    expect(messageId).toBeDefined();

    client.emit('ack', { topic: 'snapshot', messageId });
    await delay(80);
    dispatcher.processRetries();

    const countAfterAck = receivedCount;
    await delay(80);
    dispatcher.processRetries();

    expect(receivedCount).toBe(countAfterAck);

    dispatcher.publish('/feed', 'snapshot', { value: 2 });
    await waitFor(() => receivedCount >= countAfterAck + 1, 300);

    await delay(60);
    dispatcher.processRetries();
    await waitFor(() => receivedCount >= countAfterAck + 2, 300);

    const countAfterRetry = receivedCount;

    await delay(80);
    dispatcher.processRetries();
    await delay(40);
    dispatcher.processRetries();

    expect(receivedCount).toBe(countAfterRetry);

    handler.stop();
    dispatcher.close();
  });
});

async function delay(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate: () => boolean, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`timeout after ${timeoutMs}ms`);
    }
    await delay(5);
  }
}
