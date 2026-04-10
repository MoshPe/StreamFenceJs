import { describe, expect, it } from 'vitest';
import { createTopicMessageMetadata } from '../../../../src/internal/protocol/TopicMessageMetadata.js';
import {
  createOutboundTopicMessage,
  type OutboundTopicMessage,
} from '../../../../src/internal/protocol/OutboundTopicMessage.js';

function meta() {
  return createTopicMessageMetadata({
    namespace: '/feed',
    topic: 'snapshot',
    messageId: 'id-1',
    ackRequired: false,
  });
}

describe('OutboundTopicMessage', () => {
  it('creates a frozen message with eventName, metadata, args, and byte size', () => {
    const m: OutboundTopicMessage = createOutboundTopicMessage({
      eventName: 'snapshot',
      metadata: meta(),
      eventArguments: [{ value: 42 }],
      estimatedBytes: 256,
    });
    expect(m.eventName).toBe('snapshot');
    expect(m.metadata.topic).toBe('snapshot');
    expect(m.eventArguments).toEqual([{ value: 42 }]);
    expect(m.estimatedBytes).toBe(256);
    expect(Object.isFrozen(m)).toBe(true);
  });

  it('takes a defensive copy of eventArguments on creation', () => {
    const args: unknown[] = [{ a: 1 }];
    const m = createOutboundTopicMessage({
      eventName: 'evt',
      metadata: meta(),
      eventArguments: args,
      estimatedBytes: 1,
    });
    args.push({ b: 2 });
    expect(m.eventArguments).toHaveLength(1);
  });

  it('returns a defensive copy of eventArguments on read', () => {
    const m = createOutboundTopicMessage({
      eventName: 'evt',
      metadata: meta(),
      eventArguments: [{ a: 1 }],
      estimatedBytes: 1,
    });
    const firstRead = m.eventArguments;
    const secondRead = m.eventArguments;
    expect(firstRead).not.toBe(secondRead);
    expect(firstRead).toEqual(secondRead);
  });

  it('throws when estimatedBytes <= 0', () => {
    expect(() =>
      createOutboundTopicMessage({
        eventName: 'e',
        metadata: meta(),
        eventArguments: [],
        estimatedBytes: 0,
      }),
    ).toThrow('estimatedBytes must be positive');
    expect(() =>
      createOutboundTopicMessage({
        eventName: 'e',
        metadata: meta(),
        eventArguments: [],
        estimatedBytes: -1,
      }),
    ).toThrow('estimatedBytes must be positive');
  });
});
