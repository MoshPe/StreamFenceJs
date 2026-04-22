/**
 * Listener interface for server lifecycle and runtime events.
 *
 * Register a listener via the server builder's `.listener()` method. Every callback is
 * optional - only implement what you care about. Exceptions thrown from any callback
 * are caught and logged by the server and do not affect the runtime or other listeners.
 *
 * Mirrors `io.streamfence.ServerEventListener` in the parent Java library.
 */
export interface ServerEventListener {
  onServerStarting?(event: ServerStartingEvent): void;
  onServerStarted?(event: ServerStartedEvent): void;
  onServerStopping?(event: ServerStoppingEvent): void;
  onServerStopped?(event: ServerStoppedEvent): void;

  onClientConnected?(event: ClientConnectedEvent): void;
  onClientDisconnected?(event: ClientDisconnectedEvent): void;

  onSubscribed?(event: SubscribedEvent): void;
  onUnsubscribed?(event: UnsubscribedEvent): void;

  onPublishAccepted?(event: PublishAcceptedEvent): void;
  onPublishRejected?(event: PublishRejectedEvent): void;
  onQueueOverflow?(event: QueueOverflowEvent): void;

  onAuthRejected?(event: AuthRejectedEvent): void;

  onRetry?(event: RetryEvent): void;
  onRetryExhausted?(event: RetryExhaustedEvent): void;
}

/** Fired immediately before the Socket.IO server binds its port. */
export interface ServerStartingEvent {
  readonly host: string;
  readonly port: number;
}

/** Fired after the Socket.IO server has successfully started. */
export interface ServerStartedEvent {
  readonly host: string;
  readonly port: number;
}

/** Fired when server shutdown begins. */
export interface ServerStoppingEvent {
  readonly host: string;
  readonly port: number;
}

/** Fired after the server has fully stopped. */
export interface ServerStoppedEvent {
  readonly host: string;
  readonly port: number;
}

/** Fired when a client opens a Socket.IO connection to a namespace. */
export interface ClientConnectedEvent {
  readonly namespace: string;
  readonly clientId: string;
  readonly transport: 'websocket' | 'polling';
  readonly principal: string | null;
}

/** Fired when a client disconnects from a namespace. */
export interface ClientDisconnectedEvent {
  readonly namespace: string;
  readonly clientId: string;
}

/** Fired when a client successfully subscribes to a topic. */
export interface SubscribedEvent {
  readonly namespace: string;
  readonly clientId: string;
  readonly topic: string;
}

/** Fired when a client unsubscribes from a topic. */
export interface UnsubscribedEvent {
  readonly namespace: string;
  readonly clientId: string;
  readonly topic: string;
}

/** Fired when a message is successfully enqueued for a subscriber. */
export interface PublishAcceptedEvent {
  readonly namespace: string;
  readonly clientId: string;
  readonly topic: string;
}

/**
 * Fired when a publish is rejected for a subscriber (e.g. queue full with
 * `OverflowAction.REJECT_NEW`).
 */
export interface PublishRejectedEvent {
  readonly namespace: string;
  readonly clientId: string;
  readonly topic: string;
  readonly reasonCode: string;
  readonly reason: string;
}

/**
 * Fired when a client's per-topic queue overflows and the configured `OverflowAction`
 * is applied.
 */
export interface QueueOverflowEvent {
  readonly namespace: string;
  readonly clientId: string;
  readonly topic: string;
  readonly reason: string;
}

/**
 * Fired when a connection attempt is rejected by the `TokenValidator` or the auth
 * rate limiter.
 */
export interface AuthRejectedEvent {
  readonly namespace: string;
  readonly clientId: string;
  readonly remoteAddress: string;
  readonly reason: string;
}

/** Fired each time an `AT_LEAST_ONCE` message is retried. */
export interface RetryEvent {
  readonly namespace: string;
  readonly clientId: string;
  readonly topic: string;
  readonly messageId: string;
  /** 1-based retry attempt number. */
  readonly retryCount: number;
}

/**
 * Fired when all retry attempts for an `AT_LEAST_ONCE` message are exhausted without
 * an acknowledgement. The message is discarded.
 */
export interface RetryExhaustedEvent {
  readonly namespace: string;
  readonly clientId: string;
  readonly topic: string;
  readonly messageId: string;
  /** Total number of retry attempts made. */
  readonly retryCount: number;
}
