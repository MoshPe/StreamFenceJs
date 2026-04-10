import { describe, expect, it } from 'vitest';
import { DeliveryMode } from '../../../../src/DeliveryMode.js';
import { createTopicMessageMetadata } from '../../../../src/internal/protocol/TopicMessageMetadata.js';
import { createLaneEntry, type LaneEntry } from '../../../../src/internal/delivery/LaneEntry.js';
import { PublishedMessage } from '../../../../src/internal/delivery/PublishedMessage.js';

function createMessage() {
  return PublishedMessage.create({
    metadata: createTopicMessageMetadata({
      namespace: '/feed',
      topic: 'snapshot',
      messageId: 'msg-1',
      ackRequired: false,
    }),
    payloadBytes: new Uint8Array([1, 2, 3]),
    deliveryMode: DeliveryMode.BEST_EFFORT,
  });
}

describe('LaneEntry', () => {
  it('creates an immutable queue entry with client id, timestamp, attempt, and spill marker', () => {
    const entry: LaneEntry = createLaneEntry({
      clientId: 'client-1',
      message: createMessage(),
      enqueuedAtMs: 1_700_000_000_000,
      attempt: 2,
      spillFilePath: 'spill/client-1/snapshot-1.json',
    });

    expect(entry.clientId).toBe('client-1');
    expect(entry.message.metadata.messageId).toBe('msg-1');
    expect(entry.enqueuedAtMs).toBe(1_700_000_000_000);
    expect(entry.attempt).toBe(2);
    expect(entry.spillFilePath).toBe('spill/client-1/snapshot-1.json');
    expect(Object.isFrozen(entry)).toBe(true);
  });

  it('defaults spillFilePath to null when omitted', () => {
    const entry = createLaneEntry({
      clientId: 'client-2',
      message: createMessage(),
      enqueuedAtMs: 10,
      attempt: 1,
    });

    expect(entry.spillFilePath).toBeNull();
  });
});
