/**
 * Engine.IO transport policy applied to a StreamFence server.
 *
 * This is server-level transport capability. Namespace-level `allowPolling` can
 * further restrict polling even when the server supports it.
 */
export const EngineIoTransportMode = {
  WEBSOCKET_ONLY: 'WEBSOCKET_ONLY',
  WEBSOCKET_OR_POLLING: 'WEBSOCKET_OR_POLLING',
} as const;

export type EngineIoTransportModeValue =
  (typeof EngineIoTransportMode)[keyof typeof EngineIoTransportMode];
