import { describe, expect, it, vi } from 'vitest';
import { DeliveryMode } from '../../../../src/DeliveryMode.js';
import { createTopicMessageMetadata } from '../../../../src/internal/protocol/TopicMessageMetadata.js';
import {
  PublishedMessage,
  type PublishedMessage as PublishedMessageValue,
} from '../../../../src/internal/delivery/PublishedMessage.js';

function metadata() {
  return createTopicMessageMetadata({
    namespace: '/feed',
    topic: 'snapshot',
    messageId: 'msg-1',
    ackRequired: false,
  });
}

describe('PublishedMessage', () => {
  it('creates an immutable message with metadata, payload bytes, byte length, and delivery mode', () => {
    const sourceBytes = new Uint8Array([1, 2, 3, 4]);

    const message: PublishedMessageValue = PublishedMessage.create({
      metadata: metadata(),
      payloadBytes: sourceBytes,
      deliveryMode: DeliveryMode.BEST_EFFORT,
    });

    sourceBytes[0] = 99;

    expect(message.metadata.topic).toBe('snapshot');
    expect(Array.from(message.payloadBytes)).toEqual([1, 2, 3, 4]);
    expect(message.byteLength).toBe(4);
    expect(message.deliveryMode).toBe(DeliveryMode.BEST_EFFORT);
    expect(message.refCount).toBe(1);
    expect(message.disposed).toBe(false);
    expect(Object.isFrozen(message)).toBe(true);
  });

  it('retains and releases the message, disposing exactly once at zero references', () => {
    const onDispose = vi.fn();
    const message = PublishedMessage.create({
      metadata: metadata(),
      payloadBytes: new Uint8Array([9, 8, 7]),
      deliveryMode: DeliveryMode.AT_LEAST_ONCE,
      onDispose,
    });

    message.retain();
    expect(message.refCount).toBe(2);

    message.release();
    expect(message.refCount).toBe(1);
    expect(message.disposed).toBe(false);
    expect(onDispose).not.toHaveBeenCalled();

    message.release();
    expect(message.refCount).toBe(0);
    expect(message.disposed).toBe(true);
    expect(onDispose).toHaveBeenCalledTimes(1);
  });

  it('throws on refcount underflow and does not dispose twice', () => {
    const onDispose = vi.fn();
    const message = PublishedMessage.create({
      metadata: metadata(),
      payloadBytes: new Uint8Array([1]),
      deliveryMode: DeliveryMode.BEST_EFFORT,
      onDispose,
    });

    message.release();

    expect(() => message.release()).toThrow('PublishedMessage refCount underflow');
    expect(onDispose).toHaveBeenCalledTimes(1);
  });
});
