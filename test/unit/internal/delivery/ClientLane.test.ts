import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { OverflowAction } from '../../../../src/OverflowAction.js';
import { EnqueueStatus } from '../../../../src/internal/delivery/EnqueueResult.js';
import { ClientLane } from '../../../../src/internal/delivery/ClientLane.js';
import { DiskSpillQueue } from '../../../../src/internal/delivery/DiskSpillQueue.js';
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

  it('spills overflow entries to disk and replays them in FIFO order', () => {
    const spillRoot = mkdtempSync(join(tmpdir(), 'streamfence-client-lane-'));

    try {
      const lane = new ClientLane(
        makeTopicPolicy({
          overflowAction: OverflowAction.SPILL_TO_DISK,
          maxQueuedMessagesPerClient: 1,
        }),
        new DiskSpillQueue(spillRoot),
      );

      const first = makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm1' }) });
      const second = makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm2' }) });
      const third = makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm3' }) });

      expect(lane.enqueue(first).status).toBe(EnqueueStatus.ACCEPTED);
      expect(lane.enqueue(second).status).toBe(EnqueueStatus.SPILLED);
      expect(lane.enqueue(third).status).toBe(EnqueueStatus.SPILLED);

      expect(lane.poll()?.messageId).toBe('m1');
      expect(lane.poll()?.messageId).toBe('m2');
      expect(lane.poll()?.messageId).toBe('m3');
      expect(lane.poll()).toBeUndefined();
    } finally {
      rmSync(spillRoot, { force: true, recursive: true });
    }
  });

  it('purges spilled entries when clearSpill is called', () => {
    const spillRoot = mkdtempSync(join(tmpdir(), 'streamfence-client-lane-clear-'));

    try {
      const lane = new ClientLane(
        makeTopicPolicy({
          overflowAction: OverflowAction.SPILL_TO_DISK,
          maxQueuedMessagesPerClient: 1,
        }),
        new DiskSpillQueue(spillRoot),
      );

      lane.enqueue(makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm1' }) }));
      lane.enqueue(makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm2' }) }));

      lane.clearSpill();

      expect(lane.poll()?.messageId).toBe('m1');
      expect(lane.poll()).toBeUndefined();
      expect(lane.hasPendingSend()).toBe(false);
    } finally {
      rmSync(spillRoot, { force: true, recursive: true });
    }
  });
});
