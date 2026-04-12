import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeliveryMode } from '../../../../src/DeliveryMode.js';
import type { ServerMetrics } from '../../../../src/ServerMetrics.js';
import { AckTracker } from '../../../../src/internal/delivery/AckTracker.js';
import { ClientSessionRegistry } from '../../../../src/internal/delivery/ClientSessionRegistry.js';
import { ClientSessionState } from '../../../../src/internal/delivery/ClientSessionState.js';
import { RetryService } from '../../../../src/internal/delivery/RetryService.js';
import { TopicDispatcher } from '../../../../src/internal/delivery/TopicDispatcher.js';
import { TopicRegistry } from '../../../../src/internal/delivery/TopicRegistry.js';
import { makeFakeTransportClient, makeTopicPolicy } from './helpers.js';

function makeMetrics(): ServerMetrics {
  return {
    recordConnect: vi.fn(),
    recordDisconnect: vi.fn(),
    recordPublish: vi.fn(),
    recordReceived: vi.fn(),
    recordQueueOverflow: vi.fn(),
    recordRetry: vi.fn(),
    recordRetryExhausted: vi.fn(),
    recordDropped: vi.fn(),
    recordCoalesced: vi.fn(),
    recordAuthRejected: vi.fn(),
    recordAuthRateLimited: vi.fn(),
    scrape: vi.fn().mockReturnValue(''),
  };
}

function setupSession(registry: ClientSessionRegistry, clientId = 'client-1') {
  const client = makeFakeTransportClient(clientId);
  const session = new ClientSessionState(clientId, '/feed', client);

  registry.register(session);
  registry.subscribe(session, 'snapshot');

  return { session, client };
}

async function flushMicrotaskQueue(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => {
  vi.useRealTimers();
});

describe('TopicDispatcher', () => {
  it('publishes to subscribed clients and drains BEST_EFFORT lanes', async () => {
    const topicRegistry = new TopicRegistry();
    topicRegistry.register(
      makeTopicPolicy({ topic: 'snapshot', deliveryMode: DeliveryMode.BEST_EFFORT }),
    );

    const sessionRegistry = new ClientSessionRegistry();
    const { client } = setupSession(sessionRegistry);

    const ackTracker = new AckTracker();
    const retryService = new RetryService(ackTracker, 10_000);
    const metrics = makeMetrics();

    const dispatcher = new TopicDispatcher({
      topicRegistry,
      sessionRegistry,
      ackTracker,
      retryService,
      metrics,
    });

    dispatcher.publish('/feed', 'snapshot', { value: 1 });
    await flushMicrotaskQueue();

    expect(client.events).toHaveLength(1);
    expect(client.events[0]?.eventName).toBe('snapshot');
    expect(metrics.recordPublish).toHaveBeenCalledWith('/feed', 'snapshot', expect.any(Number));

    dispatcher.close();
  });

  it('AT_LEAST_ONCE respects maxInFlight and sends next message after ack', async () => {
    const topicRegistry = new TopicRegistry();
    topicRegistry.register(
      makeTopicPolicy({
        topic: 'snapshot',
        deliveryMode: DeliveryMode.AT_LEAST_ONCE,
        maxInFlight: 1,
        ackTimeoutMs: 100,
        maxRetries: 1,
      }),
    );

    const sessionRegistry = new ClientSessionRegistry();
    const { session, client } = setupSession(sessionRegistry);

    const ackTracker = new AckTracker();
    const retryService = new RetryService(ackTracker, 10_000);
    const dispatcher = new TopicDispatcher({
      topicRegistry,
      sessionRegistry,
      ackTracker,
      retryService,
      metrics: makeMetrics(),
    });

    dispatcher.publish('/feed', 'snapshot', { value: 1 });
    dispatcher.publish('/feed', 'snapshot', { value: 2 });
    await flushMicrotaskQueue();

    expect(client.events).toHaveLength(1);
    expect(ackTracker.pendingCount).toBe(1);

    const firstId = session.lane('snapshot')?.peek()?.messageId;
    expect(firstId).toBeDefined();

    dispatcher.acknowledge('client-1', '/feed', 'snapshot', firstId as string);
    await flushMicrotaskQueue();

    expect(client.events).toHaveLength(2);

    dispatcher.close();
  });

  it('processRetries resends timed-out messages', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const topicRegistry = new TopicRegistry();
    topicRegistry.register(
      makeTopicPolicy({
        topic: 'snapshot',
        deliveryMode: DeliveryMode.AT_LEAST_ONCE,
        maxInFlight: 1,
        ackTimeoutMs: 10,
        maxRetries: 1,
      }),
    );

    const sessionRegistry = new ClientSessionRegistry();
    const { client } = setupSession(sessionRegistry);

    const ackTracker = new AckTracker();
    const retryService = new RetryService(ackTracker, 10_000);
    const metrics = makeMetrics();

    const dispatcher = new TopicDispatcher({
      topicRegistry,
      sessionRegistry,
      ackTracker,
      retryService,
      metrics,
    });

    dispatcher.publish('/feed', 'snapshot', { value: 1 });
    await flushMicrotaskQueue();

    vi.advanceTimersByTime(20);
    dispatcher.processRetries();
    await flushMicrotaskQueue();

    expect(client.events.length).toBeGreaterThanOrEqual(2);
    expect(metrics.recordRetry).toHaveBeenCalledWith('/feed', 'snapshot');

    dispatcher.close();
  });
});
