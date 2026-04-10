import { describe, expect, it } from 'vitest';
import { DeliveryMode } from '../../../../src/DeliveryMode.js';
import { createTopicMessageMetadata } from '../../../../src/internal/protocol/TopicMessageMetadata.js';
import {
  EnqueueStatus,
  createEnqueueResult,
  type EnqueueResult,
} from '../../../../src/internal/delivery/EnqueueResult.js';
import { createLaneEntry } from '../../../../src/internal/delivery/LaneEntry.js';
import { PublishedMessage } from '../../../../src/internal/delivery/PublishedMessage.js';

function entry(messageId: string) {
  return createLaneEntry({
    clientId: 'client-1',
    enqueuedAtMs: 1_700_000_000_000,
    attempt: 1,
    message: PublishedMessage.create({
      metadata: createTopicMessageMetadata({
        namespace: '/feed',
        topic: 'snapshot',
        messageId,
        ackRequired: false,
      }),
      payloadBytes: new Uint8Array([1, 2, 3]),
      deliveryMode: DeliveryMode.BEST_EFFORT,
    }),
  });
}

describe('EnqueueStatus', () => {
  it('exposes the expected statuses', () => {
    expect(EnqueueStatus.ACCEPTED).toBe('ACCEPTED');
    expect(EnqueueStatus.DROPPED_OLD).toBe('DROPPED_OLD');
    expect(EnqueueStatus.REJECTED).toBe('REJECTED');
    expect(EnqueueStatus.SPILLED).toBe('SPILLED');
    expect(EnqueueStatus.DISCONNECTED).toBe('DISCONNECTED');
    expect(Object.keys(EnqueueStatus)).toHaveLength(5);
  });
});

describe('createEnqueueResult', () => {
  it('creates an immutable result with accepted, dropped, and spilled entries', () => {
    const accepted = entry('accepted');
    const dropped = entry('dropped');
    const spilled = entry('spilled');

    const result: EnqueueResult = createEnqueueResult({
      status: EnqueueStatus.SPILLED,
      acceptedEntry: accepted,
      droppedEntries: [dropped],
      spilledEntry: spilled,
      reason: 'queue full',
    });

    expect(result.status).toBe(EnqueueStatus.SPILLED);
    expect(result.acceptedEntry?.message.metadata.messageId).toBe('accepted');
    expect(result.droppedEntries).toHaveLength(1);
    expect(result.spilledEntry?.message.metadata.messageId).toBe('spilled');
    expect(result.reason).toBe('queue full');
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('defaults droppedEntries to an empty frozen array', () => {
    const result = createEnqueueResult({
      status: EnqueueStatus.ACCEPTED,
      acceptedEntry: entry('accepted'),
    });

    expect(result.droppedEntries).toEqual([]);
    expect(Object.isFrozen(result.droppedEntries)).toBe(true);
  });
});
