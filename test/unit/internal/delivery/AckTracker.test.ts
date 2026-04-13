import { describe, expect, it } from 'vitest';
import { RetryAction } from '../../../../src/internal/delivery/RetryDecision.js';
import { AckTracker } from '../../../../src/internal/delivery/AckTracker.js';
import { makeLaneEntry, makePublishedMessage } from './helpers.js';

describe('AckTracker', () => {
  it('registers and acknowledges pending messages', () => {
    const tracker = new AckTracker();
    const entry = makeLaneEntry({
      publishedMessage: makePublishedMessage({ messageId: 'm1', ackRequired: true }),
      awaiting: true,
    });

    tracker.register('client-1', '/feed', 'snapshot', entry, 50, 2, 1000);

    expect(tracker.pendingCount).toBe(1);
    expect(tracker.acknowledge('client-1', '/feed', 'snapshot', 'm1')).toBe(true);
    expect(tracker.pendingCount).toBe(0);
    expect(tracker.acknowledge('client-1', '/feed', 'snapshot', 'm1')).toBe(false);
  });

  it('returns RETRY before maxRetries and EXHAUSTED when exhausted', () => {
    const tracker = new AckTracker();
    const entry = makeLaneEntry({
      publishedMessage: makePublishedMessage({ messageId: 'm2', ackRequired: true }),
      awaiting: true,
    });

    tracker.register('client-1', '/feed', 'snapshot', entry, 10, 1, 0);

    const first = tracker.collectExpired(10);
    expect(first).toHaveLength(1);
    expect(first[0]?.action).toBe(RetryAction.RETRY);
    expect(entry.retryCount).toBe(1);

    const second = tracker.collectExpired(20);
    expect(second).toHaveLength(1);
    expect(second[0]?.action).toBe(RetryAction.EXHAUSTED);
    expect(tracker.pendingCount).toBe(0);
  });

  it('supports removeClient and removeClientTopic', () => {
    const tracker = new AckTracker();

    tracker.register(
      'client-1',
      '/feed',
      'snapshot',
      makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm1' }) }),
      50,
      2,
      0,
    );
    tracker.register(
      'client-1',
      '/feed',
      'alerts',
      makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm2', topic: 'alerts' }) }),
      50,
      2,
      0,
    );

    tracker.removeClientTopic('client-1', '/feed', 'snapshot');

    expect(tracker.pendingCount).toBe(1);

    tracker.removeClient('client-1');

    expect(tracker.pendingCount).toBe(0);
  });

  it('ignores stale expiration handles after re-registering the same message id', () => {
    const tracker = new AckTracker();
    const firstEntry = makeLaneEntry({
      publishedMessage: makePublishedMessage({ messageId: 'm1', ackRequired: true }),
      awaiting: true,
    });
    const replacementEntry = makeLaneEntry({
      publishedMessage: makePublishedMessage({ messageId: 'm1', ackRequired: true }),
      awaiting: true,
    });

    tracker.register('client-1', '/feed', 'snapshot', firstEntry, 10, 0, 0);
    tracker.register('client-1', '/feed', 'snapshot', replacementEntry, 20, 0, 5);

    expect(tracker.collectExpired(10)).toEqual([]);

    const decisions = tracker.collectExpired(25);
    expect(decisions).toHaveLength(1);
    expect(decisions[0]?.action).toBe(RetryAction.EXHAUSTED);
    expect(decisions[0]?.pendingMessage).toBe(replacementEntry);
    expect(firstEntry.awaiting).toBe(true);
    expect(replacementEntry.awaiting).toBe(false);
  });

  it('ignores expiration handles for entries already acknowledged', () => {
    const tracker = new AckTracker();

    tracker.register(
      'client-1',
      '/feed',
      'snapshot',
      makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm1' }) }),
      10,
      0,
      0,
    );

    expect(tracker.acknowledge('client-1', '/feed', 'snapshot', 'm1')).toBe(true);
    expect(tracker.collectExpired(20)).toEqual([]);
  });

  it('removeClientTopic preserves entries for other namespaces and topics', () => {
    const tracker = new AckTracker();

    tracker.register(
      'client-1',
      '/feed',
      'snapshot',
      makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm1' }) }),
      50,
      0,
      0,
    );
    tracker.register(
      'client-1',
      '/feed',
      'alerts',
      makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm2', topic: 'alerts' }) }),
      50,
      0,
      0,
    );
    tracker.register(
      'client-1',
      '/admin',
      'snapshot',
      makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm3', namespace: '/admin' }) }),
      50,
      0,
      0,
    );

    tracker.removeClientTopic('client-1', '/feed', 'snapshot');

    expect(tracker.pendingCount).toBe(2);
    expect(tracker.acknowledge('client-1', '/feed', 'alerts', 'm2')).toBe(true);
    expect(tracker.acknowledge('client-1', '/admin', 'snapshot', 'm3')).toBe(true);
  });

  it('returns expirations in deadline order for multiple entries', () => {
    const tracker = new AckTracker();

    tracker.register(
      'client-1',
      '/feed',
      'snapshot',
      makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm1' }) }),
      10,
      0,
      0,
    );
    tracker.register(
      'client-2',
      '/feed',
      'snapshot',
      makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm2' }) }),
      5,
      0,
      0,
    );
    tracker.register(
      'client-3',
      '/feed',
      'snapshot',
      makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm3' }) }),
      7,
      0,
      0,
    );

    const decisions = tracker.collectExpired(10);

    expect(decisions.map((decision) => decision.pendingMessage.messageId)).toEqual([
      'm2',
      'm3',
      'm1',
    ]);
    expect(decisions.every((decision) => decision.action === RetryAction.EXHAUSTED)).toBe(true);
  });
});
