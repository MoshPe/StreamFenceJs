/**
 * Internal wire type - server -> client error response.
 *
 * Mirrors `io.streamfence.internal.protocol.ErrorPayload`. NOT part of the public API.
 *
 * @internal
 */
export interface ErrorPayload {
  readonly code: string;
  readonly message: string;
}
