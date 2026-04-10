/**
 * Per-topic message delivery guarantee.
 *
 * Configured on a `NamespaceSpec` and governs how the server handles unacknowledged
 * messages for each subscriber.
 *
 * Mirrors `io.streamfence.DeliveryMode` in the parent Java library.
 */
export const DeliveryMode = {
  /**
   * Messages are delivered at most once with no acknowledgement or retry. The server
   * enqueues the message and discards it according to the configured `OverflowAction`
   * when the queue is full. Suitable for high-frequency feeds where occasional loss is
   * acceptable (e.g. live snapshots, tick data).
   */
  BEST_EFFORT: 'BEST_EFFORT',

  /**
   * Messages are delivered at least once. Each outbound message is assigned a
   * `messageId` and the server retries delivery until the client sends an `ack` or the
   * retry budget configured on the namespace is exhausted.
   */
  AT_LEAST_ONCE: 'AT_LEAST_ONCE',
} as const;

export type DeliveryModeValue = (typeof DeliveryMode)[keyof typeof DeliveryMode];
