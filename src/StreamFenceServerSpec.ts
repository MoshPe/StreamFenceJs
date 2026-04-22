import type { AuthModeValue } from './AuthMode.js';
import type { EngineIoTransportModeValue } from './EngineIoTransportMode.js';
import type { NamespaceSpec } from './NamespaceSpec.js';
import type { ServerEventListener } from './ServerEventListener.js';
import type { ServerMetrics } from './ServerMetrics.js';
import type { TlsConfig } from './TlsConfig.js';
import type { TokenValidator } from './TokenValidator.js';
import type { TransportModeValue } from './TransportMode.js';

export interface StreamFenceServerSpec {
  readonly host: string;
  readonly port: number;
  readonly transportMode: TransportModeValue;
  readonly engineIoTransportMode: EngineIoTransportModeValue;
  readonly authMode: AuthModeValue;
  readonly tokenValidator: TokenValidator | null;
  readonly tlsConfig: TlsConfig | null;
  readonly listeners: readonly ServerEventListener[];
  readonly metrics: ServerMetrics;
  readonly spillRootPath: string;
  readonly namespaces: readonly NamespaceSpec[];
}

export function createStreamFenceServerSpec(input: {
  host: string;
  port: number;
  transportMode: TransportModeValue;
  engineIoTransportMode: EngineIoTransportModeValue;
  authMode: AuthModeValue;
  tokenValidator: TokenValidator | null;
  tlsConfig: TlsConfig | null;
  listeners: readonly ServerEventListener[];
  metrics: ServerMetrics;
  spillRootPath: string;
  namespaces: readonly NamespaceSpec[];
}): StreamFenceServerSpec {
  return Object.freeze({
    host: input.host,
    port: input.port,
    transportMode: input.transportMode,
    engineIoTransportMode: input.engineIoTransportMode,
    authMode: input.authMode,
    tokenValidator: input.tokenValidator,
    tlsConfig: input.tlsConfig,
    listeners: Object.freeze([...input.listeners]),
    metrics: input.metrics,
    spillRootPath: input.spillRootPath,
    namespaces: Object.freeze([...input.namespaces]),
  });
}
