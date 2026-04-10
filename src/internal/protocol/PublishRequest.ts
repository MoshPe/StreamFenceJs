/**
 * Internal wire type - client -> server publish request (when inbound publishing is
 * permitted by the namespace policy).
 *
 * Mirrors `io.streamfence.internal.protocol.PublishRequest`. The Java version uses
 * Jackson's `JsonNode` for the payload; Node uses `unknown` since Socket.IO already
 * hands back parsed JavaScript values.
 *
 * NOT part of the public API.
 *
 * @internal
 */
export interface PublishRequest {
  readonly topic: string;
  readonly payload: unknown;
  readonly token: string | null;
}
