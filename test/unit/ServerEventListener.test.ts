import { describe, expect, it } from 'vitest';
import type {
  AuthRejectedEvent,
  ClientConnectedEvent,
  ClientDisconnectedEvent,
  PublishAcceptedEvent,
  PublishRejectedEvent,
  QueueOverflowEvent,
  RetryEvent,
  RetryExhaustedEvent,
  ServerEventListener,
  ServerStartedEvent,
  ServerStartingEvent,
  ServerStoppedEvent,
  ServerStoppingEvent,
  SubscribedEvent,
  UnsubscribedEvent,
} from '../../src/ServerEventListener.js';

describe('ServerEventListener', () => {
  it('accepts a listener that implements only a subset of callbacks', () => {
    const listener: ServerEventListener = {
      onClientConnected(event: ClientConnectedEvent) {
        expect(event.namespace).toBeDefined();
      },
    };
    expect('onClientConnected' in listener).toBe(true);
    expect('onClientDisconnected' in listener).toBe(false);
  });

  it('accepts a listener that implements every callback', () => {
    const listener: ServerEventListener = {
      onServerStarting(_e: ServerStartingEvent) {},
      onServerStarted(_e: ServerStartedEvent) {},
      onServerStopping(_e: ServerStoppingEvent) {},
      onServerStopped(_e: ServerStoppedEvent) {},
      onClientConnected(_e: ClientConnectedEvent) {},
      onClientDisconnected(_e: ClientDisconnectedEvent) {},
      onSubscribed(_e: SubscribedEvent) {},
      onUnsubscribed(_e: UnsubscribedEvent) {},
      onPublishAccepted(_e: PublishAcceptedEvent) {},
      onPublishRejected(_e: PublishRejectedEvent) {},
      onQueueOverflow(_e: QueueOverflowEvent) {},
      onAuthRejected(_e: AuthRejectedEvent) {},
      onRetry(_e: RetryEvent) {},
      onRetryExhausted(_e: RetryExhaustedEvent) {},
    };
    expect(Object.keys(listener)).toHaveLength(14);
  });

  it('event records carry the expected field shapes', () => {
    const connected: ClientConnectedEvent = {
      namespace: '/feed',
      clientId: 'sock-1',
      transport: 'websocket',
      principal: null,
    };
    const retry: RetryEvent = {
      namespace: '/control',
      clientId: 'sock-2',
      topic: 'alert',
      messageId: 'm-9',
      retryCount: 3,
    };
    expect(connected.transport).toBe('websocket');
    expect(retry.retryCount).toBe(3);
  });
});
