import { describe, expect, it } from 'vitest';
import { serialize, deserialize } from '../../../../src/internal/delivery/SpilledEntry.js';
import { LaneEntry } from '../../../../src/internal/delivery/LaneEntry.js';
import { createPublishedMessage } from '../../../../src/internal/delivery/PublishedMessage.js';
import { createOutboundTopicMessage } from '../../../../src/internal/protocol/OutboundTopicMessage.js';
import { createTopicMessageMetadata } from '../../../../src/internal/protocol/TopicMessageMetadata.js';
import { makeLaneEntry, makePublishedMessage } from './helpers.js';

describe('SpilledEntry', () => {
  it('round-trips all fields through serialize/deserialize', () => {
    const entry = makeLaneEntry({
      publishedMessage: makePublishedMessage({
        namespace: '/ns',
        topic: 'prices',
        messageId: 'msg-42',
        ackRequired: true,
        estimatedBytes: 128,
        payload: { bid: 1.23, ask: 1.24 },
        coalesceKey: 'prices-key',
      }),
      retryCount: 3,
    });

    const restored = deserialize(serialize(entry));

    expect(restored.messageId).toBe('msg-42');
    expect(restored.topic).toBe('prices');
    expect(restored.outboundMessage.metadata.namespace).toBe('/ns');
    expect(restored.outboundMessage.metadata.ackRequired).toBe(true);
    expect(restored.outboundMessage.estimatedBytes).toBe(128);
    expect(restored.outboundMessage.eventArguments).toEqual([{ bid: 1.23, ask: 1.24 }]);
    expect(restored.coalesceKey).toBe('prices-key');
    expect(restored.retryCount).toBe(3);
  });

  it('preserves null coalesceKey', () => {
    const outbound = createOutboundTopicMessage({
      eventName: 'test',
      metadata: createTopicMessageMetadata({
        namespace: '/ns',
        topic: 'test',
        messageId: 'msg-null-key',
        ackRequired: false,
      }),
      eventArguments: [{ v: 1 }],
      estimatedBytes: 10,
    });
    const entry = new LaneEntry({
      publishedMessage: createPublishedMessage({ outboundMessage: outbound, coalesceKey: null }),
    });

    const restored = deserialize(serialize(entry));

    expect(restored.coalesceKey).toBeNull();
  });

  it('preserves zero retryCount', () => {
    const entry = makeLaneEntry({ retryCount: 0 });

    const restored = deserialize(serialize(entry));

    expect(restored.retryCount).toBe(0);
  });

  it('handles complex nested payloads', () => {
    const payload = { items: [1, 'two', { nested: true }], meta: null };
    const entry = makeLaneEntry({
      publishedMessage: makePublishedMessage({ payload }),
    });

    const restored = deserialize(serialize(entry));

    expect(restored.outboundMessage.eventArguments).toEqual([payload]);
  });
});
