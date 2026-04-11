import { describe, expect, it } from 'vitest';
import {
  createPublishedMessage,
  type PublishedMessage,
} from '../../../../src/internal/delivery/PublishedMessage.js';
import { createOutboundTopicMessage } from '../../../../src/internal/protocol/OutboundTopicMessage.js';
import { createTopicMessageMetadata } from '../../../../src/internal/protocol/TopicMessageMetadata.js';

describe('createPublishedMessage', () => {
  it('creates an immutable record with outbound message and coalesce key', () => {
    const message: PublishedMessage = createPublishedMessage({
      outboundMessage: createOutboundTopicMessage({
        eventName: 'snapshot',
        metadata: createTopicMessageMetadata({
          namespace: '/feed',
          topic: 'snapshot',
          messageId: 'msg-1',
          ackRequired: false,
        }),
        eventArguments: [{ value: 5 }],
        estimatedBytes: 42,
      }),
      coalesceKey: 'snapshot',
    });

    expect(message.outboundMessage.metadata.messageId).toBe('msg-1');
    expect(message.outboundMessage.estimatedBytes).toBe(42);
    expect(message.coalesceKey).toBe('snapshot');
    expect(Object.isFrozen(message)).toBe(true);
  });

  it('supports null coalesceKey', () => {
    const message = createPublishedMessage({
      outboundMessage: createOutboundTopicMessage({
        eventName: 'alerts',
        metadata: createTopicMessageMetadata({
          namespace: '/feed',
          topic: 'alerts',
          messageId: 'msg-2',
          ackRequired: true,
        }),
        eventArguments: ['value'],
        estimatedBytes: 9,
      }),
      coalesceKey: null,
    });

    expect(message.coalesceKey).toBeNull();
  });
});
