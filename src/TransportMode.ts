/**
 * Network transport and security mode for the Socket.IO server.
 *
 * Mirrors `io.streamfence.TransportMode` in the parent Java library. This enum controls
 * the TLS posture of the server, not the Engine.IO transport selection. Engine.IO
 * transport (WebSocket vs HTTP polling) is controlled separately per-namespace via
 * `NamespaceSpec.allowPolling`.
 */
export const TransportMode = {
  /** Plain WebSocket (and HTTP long-polling) with no TLS. */
  WS: 'WS',

  /**
   * WebSocket Secure: TLS is required. A `TlsConfig` must be provided via the server
   * builder.
   */
  WSS: 'WSS',
} as const;

export type TransportModeValue = (typeof TransportMode)[keyof typeof TransportMode];
