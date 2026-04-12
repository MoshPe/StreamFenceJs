import { describe, expect, it } from 'vitest';
import { OverflowAction } from '../../../../src/OverflowAction.js';
import { EnqueueStatus } from '../../../../src/internal/delivery/EnqueueResult.js';
import { ClientLane } from '../../../../src/internal/delivery/ClientLane.js';
import { makeLaneEntry, makePublishedMessage, makeTopicPolicy } from './helpers.js';

describe('ClientLane', () => {
  it('accepts when under limits and allows polling', () => {
    const lane = new ClientLane(
      makeTopicPolicy({ maxQueuedMessagesPerClient: 2, maxQueuedBytesPerClient: 128 }),
    );

    const result = lane.enqueue(makeLaneEntry());

    expect(result.status).toBe(EnqueueStatus.ACCEPTED);
    expect(lane.peek()?.messageId).toBe('msg-1');
    expect(lane.poll()?.messageId).toBe('msg-1');
    expect(lane.poll()).toBeUndefined();
  });

  it('rejects entries larger than maxQueuedBytesPerClient', () => {
    const lane = new ClientLane(makeTopicPolicy({ maxQueuedBytesPerClient: 16 }));

    const result = lane.enqueue(
      makeLaneEntry({
        publishedMessage: makePublishedMessage({
          messageId: 'too-big',
          estimatedBytes: 17,
        }),
      }),
    );

    expect(result.status).toBe(EnqueueStatus.REJECTED);
    expect(result.reason).toContain('maxQueuedBytesPerClient');
  });

  it('drops oldest when full under DROP_OLDEST', () => {
    const lane = new ClientLane(
      makeTopicPolicy({
        overflowAction: OverflowAction.DROP_OLDEST,
        maxQueuedMessagesPerClient: 1,
      }),
    );

    lane.enqueue(makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm1' }) }));
    const result = lane.enqueue(
      makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm2' }) }),
    );

    expect(result.status).toBe(EnqueueStatus.DROPPED_OLDEST_AND_ACCEPTED);
    expect(lane.peek()?.messageId).toBe('m2');
  });

  it('coalesces matching keys when coalesce is enabled', () => {
    const lane = new ClientLane(
      makeTopicPolicy({
        coalesce: true,
        maxQueuedMessagesPerClient: 1,
      }),
    );

    lane.enqueue(
      makeLaneEntry({
        publishedMessage: makePublishedMessage({ messageId: 'm1', coalesceKey: 'snapshot' }),
      }),
    );
    const result = lane.enqueue(
      makeLaneEntry({
        publishedMessage: makePublishedMessage({ messageId: 'm2', coalesceKey: 'snapshot' }),
      }),
    );

    expect(result.status).toBe(EnqueueStatus.COALESCED);
    expect(lane.peek()?.messageId).toBe('m2');
  });

  it('tracks awaiting entries and supports remove/find', () => {
    const lane = new ClientLane(makeTopicPolicy());
    const entry = makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm1' }) });

    lane.enqueue(entry);
    lane.markAwaiting(entry);

    expect(lane.inFlightCount).toBe(1);
    expect(lane.firstPendingSend()).toBeUndefined();
    expect(lane.findByMessageId('m1')).toBe(entry);

    const removed = lane.removeByMessageId('m1');

    expect(removed).toBe(entry);
    expect(lane.inFlightCount).toBe(0);
  });
});
