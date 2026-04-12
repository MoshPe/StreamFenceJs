import { describe, expect, it, vi } from 'vitest';
import type { ServerEventListener } from '../../../../src/ServerEventListener.js';
import { ServerEventPublisher } from '../../../../src/internal/observability/ServerEventPublisher.js';

describe('ServerEventPublisher', () => {
  it('publishes queue and retry events to the listener', () => {
    const onQueueOverflow = vi.fn();
    const onRetry = vi.fn();
    const onRetryExhausted = vi.fn();

    const listener: ServerEventListener = {
      onQueueOverflow,
      onRetry,
      onRetryExhausted,
    };

    const publisher = new ServerEventPublisher(listener);

    publisher.queueOverflow('/feed', 'client-1', 'snapshot', 'queue full');
    publisher.retry('/feed', 'client-1', 'snapshot', 'm1', 1);
    publisher.retryExhausted('/feed', 'client-1', 'snapshot', 'm1', 2);

    expect(onQueueOverflow).toHaveBeenCalledWith({
      namespace: '/feed',
      clientId: 'client-1',
      topic: 'snapshot',
      reason: 'queue full',
    });
    expect(onRetry).toHaveBeenCalledWith({
      namespace: '/feed',
      clientId: 'client-1',
      topic: 'snapshot',
      messageId: 'm1',
      retryCount: 1,
    });
    expect(onRetryExhausted).toHaveBeenCalledWith({
      namespace: '/feed',
      clientId: 'client-1',
      topic: 'snapshot',
      messageId: 'm1',
      retryCount: 2,
    });
  });

  it('swallows listener exceptions', () => {
    const publisher = new ServerEventPublisher({
      onQueueOverflow: () => {
        throw new Error('boom');
      },
    });

    expect(() =>
      publisher.queueOverflow('/feed', 'client-1', 'snapshot', 'overflow'),
    ).not.toThrow();

    expect(() => ServerEventPublisher.noOp().clientDisconnected('/feed', 'client-1')).not.toThrow();
  });
});
