/**
 * Internal wire type - client -> server subscribe or unsubscribe request.
 *
 * Mirrors `io.streamfence.internal.protocol.SubscriptionRequest`. NOT part of the
 * public API.
 *
 * @internal
 */
export interface SubscriptionRequest {
  readonly topic: string;
  readonly token: string | null;
}
