/**
 * Metrics collector interface for a running `StreamFenceServer`.
 *
 * Mirrors the `recordXxx` surface of `io.streamfence.ServerMetrics` in the parent Java
 * library. The real `prom-client`-backed implementation ships with Plan 2 alongside
 * the delivery engine that calls these methods. This file defines the interface and
 * a `NoopServerMetrics` used as a default so the rest of the code can wire cleanly
 * without requiring a metrics dependency.
 */
export interface ServerMetrics {
  /** Records a new client connection on `namespace`. */
  recordConnect(namespace: string): void;

  /** Records a client disconnection from `namespace`. */
  recordDisconnect(namespace: string): void;

  /** Records an outbound message published to `topic` on `namespace`. */
  recordPublish(namespace: string, topic: string, bytes: number): void;

  /** Records an inbound message received from a client on `topic`. */
  recordReceived(namespace: string, topic: string, bytes: number): void;

  /** Records a queue overflow event for `topic` on `namespace`. */
  recordQueueOverflow(namespace: string, topic: string, reason: string): void;

  /** Records one retry attempt for an unacknowledged message. */
  recordRetry(namespace: string, topic: string): void;

  /** Records a message whose retry budget was exhausted. */
  recordRetryExhausted(namespace: string, topic: string): void;

  /** Records a message dropped due to `OverflowAction.DROP_OLDEST`. */
  recordDropped(namespace: string, topic: string): void;

  /** Records a message coalesced due to `OverflowAction.COALESCE`. */
  recordCoalesced(namespace: string, topic: string): void;

  /** Records a message spilled to disk due to SPILL_TO_DISK overflow. */
  recordSpill(namespace: string, topic: string): void;

  /** Records an authentication rejection on `namespace`. */
  recordAuthRejected(namespace: string): void;

  /** Records an auth attempt rejected by the rate limiter on `namespace`. */
  recordAuthRateLimited(namespace: string): void;

  /**
   * Produces a Prometheus text-format scrape body. The no-op implementation returns an
   * empty string; the real implementation in Plan 2 returns the actual exposition.
   */
  scrape(): string;
}

/**
 * No-op `ServerMetrics` - used as a placeholder when no real metrics backend is
 * configured. All `recordXxx` methods are empty; `scrape()` returns an empty string.
 */
export class NoopServerMetrics implements ServerMetrics {
  recordConnect(_namespace: string): void {}
  recordDisconnect(_namespace: string): void {}
  recordPublish(_namespace: string, _topic: string, _bytes: number): void {}
  recordReceived(_namespace: string, _topic: string, _bytes: number): void {}
  recordQueueOverflow(_namespace: string, _topic: string, _reason: string): void {}
  recordRetry(_namespace: string, _topic: string): void {}
  recordRetryExhausted(_namespace: string, _topic: string): void {}
  recordDropped(_namespace: string, _topic: string): void {}
  recordCoalesced(_namespace: string, _topic: string): void {}
  recordSpill(_namespace: string, _topic: string): void {}
  recordAuthRejected(_namespace: string): void {}
  recordAuthRateLimited(_namespace: string): void {}
  scrape(): string {
    return '';
  }
}
