import { describe, expect, it } from 'vitest';
import { createTopicMessageMetadata } from '../../../../src/internal/protocol/TopicMessageMetadata.js';

describe('TopicMessageMetadata', () => {
  it('creates a frozen metadata record with all fields', () => {
    const meta = createTopicMessageMetadata({
      namespace: '/feed',
      topic: 'snapshot',
      messageId: 'abc-123',
      ackRequired: false,
    });
    expect(meta.namespace).toBe('/feed');
    expect(meta.topic).toBe('snapshot');
    expect(meta.messageId).toBe('abc-123');
    expect(meta.ackRequired).toBe(false);
    expect(Object.isFrozen(meta)).toBe(true);
  });

  it('supports ackRequired = true for AT_LEAST_ONCE messages', () => {
    const meta = createTopicMessageMetadata({
      namespace: '/control',
      topic: 'alert',
      messageId: 'xyz-789',
      ackRequired: true,
    });
    expect(meta.ackRequired).toBe(true);
  });
});
