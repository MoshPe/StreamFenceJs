/**
 * Internal wire type - client -> server ack for a RELIABLE message.
 *
 * Mirrors `io.streamfence.internal.protocol.AckPayload`. NOT part of the public API.
 *
 * @internal
 */
export interface AckPayload {
  readonly topic: string;
  readonly messageId: string;
}
