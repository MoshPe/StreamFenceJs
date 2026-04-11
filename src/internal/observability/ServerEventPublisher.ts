import type {
  ServerEventListener,
  QueueOverflowEvent,
  RetryEvent,
  RetryExhaustedEvent,
  PublishAcceptedEvent,
  PublishRejectedEvent,
  ClientConnectedEvent,
  ClientDisconnectedEvent,
  SubscribedEvent,
  UnsubscribedEvent,
} from '../../ServerEventListener.js';

export class ServerEventPublisher {
  static noOp(): ServerEventPublisher {
    return new ServerEventPublisher();
  }

  constructor(private readonly listener?: ServerEventListener) {}

  queueOverflow(namespace: string, clientId: string, topic: string, reason: string): void {
    this.safeCall('onQueueOverflow', {
      namespace,
      clientId,
      topic,
      reason,
    });
  }

  retry(
    namespace: string,
    clientId: string,
    topic: string,
    messageId: string,
    retryCount: number,
  ): void {
    this.safeCall('onRetry', {
      namespace,
      clientId,
      topic,
      messageId,
      retryCount,
    });
  }

  retryExhausted(
    namespace: string,
    clientId: string,
    topic: string,
    messageId: string,
    retryCount: number,
  ): void {
    this.safeCall('onRetryExhausted', {
      namespace,
      clientId,
      topic,
      messageId,
      retryCount,
    });
  }

  publishAccepted(namespace: string, clientId: string, topic: string, _messageId: string): void {
    this.safeCall('onPublishAccepted', {
      namespace,
      clientId,
      topic,
    });
  }

  publishRejected(namespace: string, clientId: string, topic: string, reason: string): void {
    this.safeCall('onPublishRejected', {
      namespace,
      clientId,
      topic,
      reasonCode: reason,
      reason,
    });
  }

  clientConnected(namespace: string, clientId: string): void {
    this.safeCall('onClientConnected', {
      namespace,
      clientId,
      transport: 'websocket',
      principal: null,
    });
  }

  clientDisconnected(namespace: string, clientId: string): void {
    this.safeCall('onClientDisconnected', {
      namespace,
      clientId,
    });
  }

  subscribed(namespace: string, clientId: string, topic: string): void {
    this.safeCall('onSubscribed', {
      namespace,
      clientId,
      topic,
    });
  }

  unsubscribed(namespace: string, clientId: string, topic: string): void {
    this.safeCall('onUnsubscribed', {
      namespace,
      clientId,
      topic,
    });
  }

  private safeCall(event: 'onQueueOverflow', payload: QueueOverflowEvent): void;
  private safeCall(event: 'onRetry', payload: RetryEvent): void;
  private safeCall(event: 'onRetryExhausted', payload: RetryExhaustedEvent): void;
  private safeCall(event: 'onPublishAccepted', payload: PublishAcceptedEvent): void;
  private safeCall(event: 'onPublishRejected', payload: PublishRejectedEvent): void;
  private safeCall(event: 'onClientConnected', payload: ClientConnectedEvent): void;
  private safeCall(event: 'onClientDisconnected', payload: ClientDisconnectedEvent): void;
  private safeCall(event: 'onSubscribed', payload: SubscribedEvent): void;
  private safeCall(event: 'onUnsubscribed', payload: UnsubscribedEvent): void;
  private safeCall(event: keyof ServerEventListener, payload: unknown): void {
    const callback = this.listener?.[event] as ((value: unknown) => void) | undefined;
    if (callback === undefined) {
      return;
    }

    try {
      callback(payload);
    } catch {
      // Listener callback exceptions are intentionally swallowed.
    }
  }
}
