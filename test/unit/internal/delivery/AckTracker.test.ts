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
});
