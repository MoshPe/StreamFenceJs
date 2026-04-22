/* eslint-disable @typescript-eslint/unbound-method -- vi.fn() mocks are plain objects; method access is safe */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DeliveryMode } from '../../../../src/DeliveryMode.js';
import { OverflowAction } from '../../../../src/OverflowAction.js';
import type { ServerMetrics } from '../../../../src/ServerMetrics.js';
import { AckTracker } from '../../../../src/internal/delivery/AckTracker.js';
import { ClientLane } from '../../../../src/internal/delivery/ClientLane.js';
import { ClientSessionRegistry } from '../../../../src/internal/delivery/ClientSessionRegistry.js';
import { ClientSessionState } from '../../../../src/internal/delivery/ClientSessionState.js';
import { DiskSpillQueue } from '../../../../src/internal/delivery/DiskSpillQueue.js';
import { RetryService } from '../../../../src/internal/delivery/RetryService.js';
import { TopicDispatcher } from '../../../../src/internal/delivery/TopicDispatcher.js';
import { TopicRegistry } from '../../../../src/internal/delivery/TopicRegistry.js';
import { ServerEventPublisher } from '../../../../src/internal/observability/ServerEventPublisher.js';
import { makeFakeTransportClient, makeTopicPolicy } from './helpers.js';

function makeMetrics(): ServerMetrics & Record<string, ReturnType<typeof vi.fn>> {
  return {
    recordConnect: vi.fn<ServerMetrics['recordConnect']>(),
    recordDisconnect: vi.fn<ServerMetrics['recordDisconnect']>(),
    recordPublish: vi.fn<ServerMetrics['recordPublish']>(),
    recordReceived: vi.fn<ServerMetrics['recordReceived']>(),
    recordQueueOverflow: vi.fn<ServerMetrics['recordQueueOverflow']>(),
    recordRetry: vi.fn<ServerMetrics['recordRetry']>(),
    recordRetryExhausted: vi.fn<ServerMetrics['recordRetryExhausted']>(),
    recordDropped: vi.fn<ServerMetrics['recordDropped']>(),
    recordCoalesced: vi.fn<ServerMetrics['recordCoalesced']>(),
    recordSpill: vi.fn<ServerMetrics['recordSpill']>(),
    recordAuthRejected: vi.fn<ServerMetrics['recordAuthRejected']>(),
    recordAuthRateLimited: vi.fn<ServerMetrics['recordAuthRateLimited']>(),
  };
}

function setupSession(
  registry: ClientSessionRegistry,
  clientId = 'client-1',
  laneFactory?: ConstructorParameters<typeof ClientSessionState>[3],
) {
  const client = makeFakeTransportClient(clientId);
  const session = new ClientSessionState(clientId, '/feed', client, laneFactory);

  registry.register(session);
  registry.subscribe(session, 'snapshot');

  return { session, client };
}

async function flushMicrotaskQueue(): Promise<void> {
  for (let i = 0; i < 20; i++) {
    await Promise.resolve();
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeThrowingClient(clientId: string, options?: { throwOnCalls?: number[] }) {
  const events: Array<{ eventName: string; args: readonly unknown[] }> = [];
  let callCount = 0;

  return {
    clientId,
    events,
    sendEvent(eventName: string, args: readonly unknown[]): void {
      callCount += 1;
      if (options?.throwOnCalls?.includes(callCount) === true) {
        throw new Error(`send failure on call ${callCount}`);
      }
      events.push({ eventName, args: [...args] });
    },
  };
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
    const recordPublish = metrics.recordPublish;

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
    expect(recordPublish).toHaveBeenCalledWith('/feed', 'snapshot', expect.any(Number));

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
    const recordRetry = metrics.recordRetry;

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
    expect(recordRetry).toHaveBeenCalledWith('/feed', 'snapshot');

    dispatcher.close();
  });

  it('swallows BEST_EFFORT send failures and continues draining later entries', async () => {
    const topicRegistry = new TopicRegistry();
    topicRegistry.register(
      makeTopicPolicy({ topic: 'snapshot', deliveryMode: DeliveryMode.BEST_EFFORT }),
    );

    const sessionRegistry = new ClientSessionRegistry();
    const client = makeThrowingClient('client-1', { throwOnCalls: [1] });
    const session = new ClientSessionState('client-1', '/feed', client);
    sessionRegistry.register(session);
    sessionRegistry.subscribe(session, 'snapshot');

    const dispatcher = new TopicDispatcher({
      topicRegistry,
      sessionRegistry,
      ackTracker: new AckTracker(),
      retryService: new RetryService(new AckTracker(), 10_000),
      metrics: makeMetrics(),
    });

    dispatcher.publish('/feed', 'snapshot', { value: 1 });
    dispatcher.publish('/feed', 'snapshot', { value: 2 });
    await flushMicrotaskQueue();

    expect(client.events).toHaveLength(1);
    expect(client.events[0]?.args[0]).toEqual({ value: 2 });

    dispatcher.close();
  });

  it('removes failed AT_LEAST_ONCE sends and continues with the next entry', async () => {
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
    const client = makeThrowingClient('client-1', { throwOnCalls: [1] });
    const session = new ClientSessionState('client-1', '/feed', client);
    sessionRegistry.register(session);
    sessionRegistry.subscribe(session, 'snapshot');

    const ackTracker = new AckTracker();
    const dispatcher = new TopicDispatcher({
      topicRegistry,
      sessionRegistry,
      ackTracker,
      retryService: new RetryService(ackTracker, 10_000),
      metrics: makeMetrics(),
    });

    dispatcher.publish('/feed', 'snapshot', { value: 1 });
    dispatcher.publish('/feed', 'snapshot', { value: 2 });
    await flushMicrotaskQueue();

    expect(client.events).toHaveLength(1);
    expect(client.events[0]?.args[0]).toEqual({ value: 2 });
    expect(session.lane('snapshot')?.findByMessageId('msg-1')).toBeUndefined();
    expect(session.lane('snapshot')?.findByMessageId('msg-2')).toBeDefined();
    expect(ackTracker.pendingCount).toBe(1);

    dispatcher.close();
  });

  it('records overflow details and replays spilled messages when disk spill is enabled', async () => {
    const spillRoot = mkdtempSync(join(tmpdir(), 'streamfence-spill-dispatcher-'));

    try {
      const topicRegistry = new TopicRegistry();
      topicRegistry.register(
        makeTopicPolicy({
          topic: 'snapshot',
          deliveryMode: DeliveryMode.BEST_EFFORT,
          overflowAction: OverflowAction.SPILL_TO_DISK,
          maxQueuedMessagesPerClient: 1,
          maxQueuedBytesPerClient: 1024,
        }),
      );

      const sessionRegistry = new ClientSessionRegistry();
      const { client } = setupSession(sessionRegistry, 'client-1', (topic, policy) => {
        return new ClientLane(policy, new DiskSpillQueue(join(spillRoot, 'feed', 'client-1', topic)));
      });

      const ackTracker = new AckTracker();
      const retryService = new RetryService(ackTracker, 10_000);
      const metrics = makeMetrics();
      const recordQueueOverflow = metrics.recordQueueOverflow;
      const onQueueOverflow = vi.fn();

      const dispatcher = new TopicDispatcher({
        topicRegistry,
        sessionRegistry,
        ackTracker,
        retryService,
        metrics,
        eventPublisher: new ServerEventPublisher({
          onQueueOverflow,
        }),
      });

      dispatcher.publish('/feed', 'snapshot', { value: 1 });
      dispatcher.publish('/feed', 'snapshot', { value: 2 });
      dispatcher.publish('/feed', 'snapshot', { value: 3 });

      // Drain is async and recovers spill files; wait for full delivery
      await delay(300);

      expect(client.events.map((event) => event.args[0])).toEqual([
        { value: 1 },
        { value: 2 },
        { value: 3 },
      ]);
      expect(recordQueueOverflow).toHaveBeenCalledWith(
        '/feed',
        'snapshot',
        'spilled to disk',
      );
      expect(onQueueOverflow).toHaveBeenCalledWith({
        namespace: '/feed',
        clientId: 'client-1',
        topic: 'snapshot',
        reason: 'spilled to disk',
      });

      dispatcher.close();
    } finally {
      rmSync(spillRoot, { force: true, recursive: true });
    }
  });

  it('publishTo ignores missing, wrong-namespace, and unsubscribed sessions', () => {
    const topicRegistry = new TopicRegistry();
    topicRegistry.register(makeTopicPolicy({ topic: 'snapshot' }));

    const sessionRegistry = new ClientSessionRegistry();

    const otherNamespaceClient = makeFakeTransportClient('client-2');
    const otherNamespaceSession = new ClientSessionState('client-2', '/other', otherNamespaceClient);
    otherNamespaceSession.subscribe('snapshot');
    sessionRegistry.register(otherNamespaceSession);

    const unsubscribedClient = makeFakeTransportClient('client-3');
    const unsubscribedSession = new ClientSessionState('client-3', '/feed', unsubscribedClient);
    sessionRegistry.register(unsubscribedSession);

    const metrics = makeMetrics();
    const dispatcher = new TopicDispatcher({
      topicRegistry,
      sessionRegistry,
      ackTracker: new AckTracker(),
      retryService: new RetryService(new AckTracker(), 10_000),
      metrics,
    });

    dispatcher.publishTo('/feed', 'missing', 'snapshot', { value: 1 });
    dispatcher.publishTo('/feed', 'client-2', 'snapshot', { value: 2 });
    dispatcher.publishTo('/feed', 'client-3', 'snapshot', { value: 3 });

    expect(otherNamespaceClient.events).toHaveLength(0);
    expect(unsubscribedClient.events).toHaveLength(0);
    expect(metrics.recordPublish).not.toHaveBeenCalled();

    dispatcher.close();
  });

  it('throws when publishing to an unknown topic policy', () => {
    const dispatcher = new TopicDispatcher({
      topicRegistry: new TopicRegistry(),
      sessionRegistry: new ClientSessionRegistry(),
      ackTracker: new AckTracker(),
      retryService: new RetryService(new AckTracker(), 10_000),
      metrics: makeMetrics(),
    });

    expect(() => dispatcher.publish('/feed', 'unknown', { value: 1 })).toThrow(
      'unknown topic policy for /feed:unknown',
    );

    dispatcher.close();
  });

  it('falls back to a 1-byte estimate when payload serialization fails', async () => {
    const topicRegistry = new TopicRegistry();
    topicRegistry.register(
      makeTopicPolicy({ topic: 'snapshot', deliveryMode: DeliveryMode.BEST_EFFORT }),
    );

    const sessionRegistry = new ClientSessionRegistry();
    const { client } = setupSession(sessionRegistry);

    const metrics = makeMetrics();
    const dispatcher = new TopicDispatcher({
      topicRegistry,
      sessionRegistry,
      ackTracker: new AckTracker(),
      retryService: new RetryService(new AckTracker(), 10_000),
      metrics,
    });

    const payload: { self?: unknown } = {};
    payload.self = payload;

    dispatcher.publish('/feed', 'snapshot', payload);
    await flushMicrotaskQueue();

    expect(client.events).toHaveLength(1);
    expect(metrics.recordPublish).toHaveBeenCalledWith('/feed', 'snapshot', 1);

    dispatcher.close();
  });

  it('acknowledge is a no-op when the session or lane is missing', () => {
    const topicRegistry = new TopicRegistry();
    topicRegistry.register(makeTopicPolicy({ topic: 'snapshot' }));

    const sessionRegistry = new ClientSessionRegistry();
    const session = new ClientSessionState('client-1', '/feed', makeFakeTransportClient('client-1'));
    session.subscribe('snapshot');
    sessionRegistry.register(session);

    const ackTracker = new AckTracker();
    const dispatcher = new TopicDispatcher({
      topicRegistry,
      sessionRegistry,
      ackTracker,
      retryService: new RetryService(ackTracker, 10_000),
      metrics: makeMetrics(),
    });

    expect(() =>
      dispatcher.acknowledge('missing', '/feed', 'snapshot', 'msg-1'),
    ).not.toThrow();
    expect(() =>
      dispatcher.acknowledge('client-1', '/feed', 'snapshot', 'msg-1'),
    ).not.toThrow();
    expect(ackTracker.pendingCount).toBe(0);

    dispatcher.close();
  });

  it('ignores disconnect and unsubscribe requests when the target session does not match', () => {
    const topicRegistry = new TopicRegistry();
    topicRegistry.register(makeTopicPolicy({ namespace: '/other', topic: 'snapshot' }));

    const sessionRegistry = new ClientSessionRegistry();
    const session = new ClientSessionState('client-1', '/other', makeFakeTransportClient('client-1'));
    session.subscribe('snapshot');
    sessionRegistry.register(session);

    const onClientDisconnected = vi.fn();
    const onUnsubscribed = vi.fn();
    const dispatcher = new TopicDispatcher({
      topicRegistry,
      sessionRegistry,
      ackTracker: new AckTracker(),
      retryService: new RetryService(new AckTracker(), 10_000),
      metrics: makeMetrics(),
      eventPublisher: new ServerEventPublisher({
        onClientDisconnected,
        onUnsubscribed,
      }),
    });

    dispatcher.onClientDisconnected('missing');
    dispatcher.onClientUnsubscribed('missing', '/feed', 'snapshot');
    dispatcher.onClientUnsubscribed('client-1', '/feed', 'snapshot');

    expect(sessionRegistry.get('client-1')).toBe(session);
    expect(session.isSubscribed('snapshot')).toBe(true);
    expect(onClientDisconnected).not.toHaveBeenCalled();
    expect(onUnsubscribed).not.toHaveBeenCalled();

    dispatcher.close();
  });

  it('processRetries tolerates expired retries whose session or lane no longer exists', async () => {
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
    const missingSessionSetup = setupSession(sessionRegistry, 'client-missing');
    const missingLaneSetup = setupSession(sessionRegistry, 'client-lane-missing');

    const ackTracker = new AckTracker();
    const metrics = makeMetrics();
    const dispatcher = new TopicDispatcher({
      topicRegistry,
      sessionRegistry,
      ackTracker,
      retryService: new RetryService(ackTracker, 10_000),
      metrics,
    });

    dispatcher.publishTo('/feed', 'client-missing', 'snapshot', { value: 1 });
    dispatcher.publishTo('/feed', 'client-lane-missing', 'snapshot', { value: 2 });
    await flushMicrotaskQueue();

    sessionRegistry.remove('client-missing');

    const replacementSession = new ClientSessionState(
      'client-lane-missing',
      '/feed',
      makeFakeTransportClient('client-lane-missing'),
    );
    replacementSession.subscribe('snapshot');
    sessionRegistry.register(replacementSession);

    vi.advanceTimersByTime(20);
    dispatcher.processRetries();
    await flushMicrotaskQueue();

    expect(metrics.recordRetry).toHaveBeenCalledTimes(2);
    expect(missingSessionSetup.client.events).toHaveLength(1);
    expect(missingLaneSetup.client.events).toHaveLength(1);

    dispatcher.close();
  });

  it('drops exhausted retry entries from the lane', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const topicRegistry = new TopicRegistry();
    topicRegistry.register(
      makeTopicPolicy({
        topic: 'snapshot',
        deliveryMode: DeliveryMode.AT_LEAST_ONCE,
        maxInFlight: 1,
        ackTimeoutMs: 10,
        maxRetries: 0,
      }),
    );

    const sessionRegistry = new ClientSessionRegistry();
    const { session } = setupSession(sessionRegistry);

    const ackTracker = new AckTracker();
    const metrics = makeMetrics();
    const dispatcher = new TopicDispatcher({
      topicRegistry,
      sessionRegistry,
      ackTracker,
      retryService: new RetryService(ackTracker, 10_000),
      metrics,
    });

    dispatcher.publish('/feed', 'snapshot', { value: 1 });
    await flushMicrotaskQueue();
    expect(session.lane('snapshot')?.peek()).toBeDefined();

    vi.advanceTimersByTime(20);
    dispatcher.processRetries();

    expect(metrics.recordRetryExhausted).toHaveBeenCalledWith('/feed', 'snapshot');
    expect(session.lane('snapshot')?.peek()).toBeUndefined();
    expect(ackTracker.pendingCount).toBe(0);

    dispatcher.close();
  });
});
