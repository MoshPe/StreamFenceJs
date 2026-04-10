import { describe, expect, it } from 'vitest';
import { createTopicMessageMetadata } from '../../../../src/internal/protocol/TopicMessageMetadata.js';
import { createTopicMessageEnvelope } from '../../../../src/internal/protocol/TopicMessageEnvelope.js';

describe('TopicMessageEnvelope', () => {
  it('wraps metadata and an arbitrary payload, freezing the envelope', () => {
    const meta = createTopicMessageMetadata({
      namespace: '/feed',
      topic: 'snapshot',
      messageId: 'id-1',
      ackRequired: false,
    });
    const env = createTopicMessageEnvelope(meta, { value: 42 });
    expect(env.metadata).toBe(meta);
    expect(env.payload).toEqual({ value: 42 });
    expect(Object.isFrozen(env)).toBe(true);
  });

  it('accepts a Buffer payload (the pre-serialized wire format)', () => {
    const meta = createTopicMessageMetadata({
      namespace: '/feed',
      topic: 'snapshot',
      messageId: 'id-2',
      ackRequired: false,
    });
    const buf = Buffer.from('{"x":1}');
    const env = createTopicMessageEnvelope(meta, buf);
    expect(env.payload).toBe(buf);
  });
});
