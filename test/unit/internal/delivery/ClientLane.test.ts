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
  it('replaces the queued snapshot under SNAPSHOT_ONLY', () => {
    const lane = new ClientLane(
      makeTopicPolicy({
        overflowAction: OverflowAction.SNAPSHOT_ONLY,
        maxQueuedMessagesPerClient: 4,
      }),
    );

    expect(
      lane.enqueue(makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm1' }) }))
        .status,
    ).toBe(EnqueueStatus.REPLACED_SNAPSHOT);
    expect(
      lane.enqueue(makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm2' }) }))
        .status,
    ).toBe(EnqueueStatus.REPLACED_SNAPSHOT);

    expect(lane.peek()?.messageId).toBe('m2');
    expect(lane.poll()?.messageId).toBe('m2');
    expect(lane.poll()).toBeUndefined();
  });

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

  it('does not coalesce over awaiting entries and rejects when no other match exists', () => {
    const lane = new ClientLane(
      makeTopicPolicy({
        overflowAction: OverflowAction.COALESCE,
        maxQueuedMessagesPerClient: 1,
      }),
    );

    const first = makeLaneEntry({
      publishedMessage: makePublishedMessage({ messageId: 'm1', coalesceKey: 'snapshot' }),
    });
    lane.enqueue(first);
    lane.markAwaiting(first);

    const result = lane.enqueue(
      makeLaneEntry({
        publishedMessage: makePublishedMessage({ messageId: 'm2', coalesceKey: 'snapshot' }),
      }),
    );

    expect(result.status).toBe(EnqueueStatus.REJECTED);
    expect(result.reason).toBe('queue full and no coalesce match');
    expect(lane.peek()?.messageId).toBe('m1');
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

  it('returns undefined when removing an unknown message id', () => {
    const lane = new ClientLane(makeTopicPolicy());

    lane.enqueue(makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm1' }) }));

    expect(lane.removeByMessageId('missing')).toBeUndefined();
    expect(lane.peek()?.messageId).toBe('m1');
  });

  it('rejects spill overflow when no spill queue is configured', () => {
    const lane = new ClientLane(
      makeTopicPolicy({
        overflowAction: OverflowAction.SPILL_TO_DISK,
        maxQueuedMessagesPerClient: 1,
      }),
    );

    expect(
      lane.enqueue(makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm1' }) }))
        .status,
    ).toBe(EnqueueStatus.ACCEPTED);

    const result = lane.enqueue(
      makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm2' }) }),
    );

    expect(result.status).toBe(EnqueueStatus.REJECTED);
    expect(result.reason).toBe('SPILL_TO_DISK: no spill queue configured');
    expect(lane.peek()?.messageId).toBe('m1');
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

  it('recovers spilled entries through firstPendingSend when memory is empty', () => {
    const spillRoot = mkdtempSync(join(tmpdir(), 'streamfence-client-lane-recover-'));

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

      expect(lane.hasPendingSend()).toBe(true);
      expect(lane.poll()?.messageId).toBe('m1');
      expect(lane.peek()).toBeUndefined();

      const recovered = lane.firstPendingSend();
      expect(recovered?.messageId).toBe('m2');
      expect(lane.peek()?.messageId).toBe('m2');
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
