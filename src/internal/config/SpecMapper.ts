import { AuthMode, type AuthModeValue } from '../../AuthMode.js';
import { DeliveryMode, type DeliveryModeValue } from '../../DeliveryMode.js';
import { EngineIoTransportMode, type EngineIoTransportModeValue } from '../../EngineIoTransportMode.js';
import { OverflowAction, type OverflowActionValue } from '../../OverflowAction.js';
import { TransportMode, type TransportModeValue } from '../../TransportMode.js';
import { NamespaceSpec } from '../../NamespaceSpec.js';
import { NoopServerMetrics } from '../../ServerMetrics.js';
import { createStreamFenceServerSpec, type StreamFenceServerSpec } from '../../StreamFenceServerSpec.js';
import { TlsConfig } from '../../TlsConfig.js';
import type { RawNamespaceConfig } from './RawNamespaceConfig.js';
import type { RawServerConfig } from './RawServerConfig.js';
import type { RawServerEntry } from './RawServerEntry.js';

/**
 * Maps a raw parsed config to a fully validated `StreamFenceServerSpec`.
 *
 * @param config   The parsed raw config (from `ServerConfigLoader` or direct parse).
 * @param serverName  The key under `config.servers` to use.
 * @throws Error if the server name is not found, enums are invalid, or namespace
 *         validation fails.
 *
 * @internal
 */
export function mapServerConfig(
  config: RawServerConfig,
  serverName: string,
): StreamFenceServerSpec {
  const entry = config.servers[serverName];
  if (entry === undefined) {
    const available = Object.keys(config.servers).join(', ');
    throw new Error(
      `No server named "${serverName}" found in config (available: ${available})`,
    );
  }
  return buildSpec(entry, serverName);
}

function buildSpec(entry: RawServerEntry, serverName: string): StreamFenceServerSpec {
  const transportMode = parseTransportMode(entry.transport);
  const engineIoTransportMode = parseEngineIoTransportMode(entry.engineIoTransport);
  const authMode = parseAuthMode(entry.auth);

  const tlsConfig =
    entry.tls !== undefined
      ? TlsConfig.create({
          certChainPemPath: entry.tls.certChainPemPath,
          privateKeyPemPath: entry.tls.privateKeyPemPath,
          ...(entry.tls.protocol !== undefined && { protocol: entry.tls.protocol }),
          ...(entry.tls.privateKeyPassword !== undefined && {
            privateKeyPassword: entry.tls.privateKeyPassword,
          }),
        })
      : null;

  // Detect duplicate namespace paths before building specs.
  const seenPaths = new Set<string>();
  for (const ns of entry.namespaces) {
    if (seenPaths.has(ns.path)) {
      throw new Error(`Duplicate namespace path "${ns.path}" in server "${serverName}"`);
    }
    seenPaths.add(ns.path);
  }

  const namespaces = entry.namespaces.map((ns) => buildNamespaceSpec(ns));

  return createStreamFenceServerSpec({
    host: entry.host ?? '0.0.0.0',
    port: entry.port,
    managementPort: entry.managementPort ?? null,
    transportMode,
    engineIoTransportMode,
    authMode,
    tokenValidator: null,
    tlsConfig,
    listeners: [],
    metrics: new NoopServerMetrics(),
    spillRootPath: entry.spillRootPath ?? '.streamfence-spill',
    namespaces,
  });
}

function buildNamespaceSpec(ns: RawNamespaceConfig) {
  const deliveryMode = parseDeliveryMode(ns.deliveryMode, ns.path);
  const overflowAction = parseOverflowAction(ns.overflowAction, ns.path);

  let builder = NamespaceSpec.builder(ns.path).topics(ns.topics);

  builder = builder.deliveryMode(deliveryMode);
  builder = builder.overflowAction(overflowAction);

  if (ns.maxQueuedMessagesPerClient !== undefined) {
    builder = builder.maxQueuedMessagesPerClient(ns.maxQueuedMessagesPerClient);
  }
  if (ns.maxQueuedBytesPerClient !== undefined) {
    builder = builder.maxQueuedBytesPerClient(ns.maxQueuedBytesPerClient);
  }
  if (ns.ackTimeoutMs !== undefined) {
    builder = builder.ackTimeoutMs(ns.ackTimeoutMs);
  }
  if (ns.maxRetries !== undefined) {
    builder = builder.maxRetries(ns.maxRetries);
  }
  if (ns.coalesce !== undefined) {
    builder = builder.coalesce(ns.coalesce);
  }
  if (ns.allowPolling !== undefined) {
    builder = builder.allowPolling(ns.allowPolling);
  }
  if (ns.maxInFlight !== undefined) {
    builder = builder.maxInFlight(ns.maxInFlight);
  }
  if (ns.authRequired !== undefined) {
    builder = builder.authRequired(ns.authRequired);
  }

  return builder.build();
}

function parseTransportMode(value: string | undefined): TransportModeValue {
  if (value === undefined) {
    return TransportMode.WS;
  }
  const valid = Object.values(TransportMode);
  if (!valid.includes(value as TransportModeValue)) {
    throw new Error(`Invalid transport "${value}" (expected: ${valid.join(', ')})`);
  }
  return value as TransportModeValue;
}

function parseEngineIoTransportMode(value: string | undefined): EngineIoTransportModeValue {
  if (value === undefined) {
    return EngineIoTransportMode.WEBSOCKET_OR_POLLING;
  }
  const valid = Object.values(EngineIoTransportMode);
  if (!valid.includes(value as EngineIoTransportModeValue)) {
    throw new Error(
      `Invalid engineIoTransport "${value}" (expected: ${valid.join(', ')})`,
    );
  }
  return value as EngineIoTransportModeValue;
}

function parseAuthMode(value: string | undefined): AuthModeValue {
  if (value === undefined) {
    return AuthMode.NONE;
  }
  const valid = Object.values(AuthMode);
  if (!valid.includes(value as AuthModeValue)) {
    throw new Error(`Invalid auth "${value}" (expected: ${valid.join(', ')})`);
  }
  return value as AuthModeValue;
}

function parseDeliveryMode(value: string | undefined, namespacePath: string): DeliveryModeValue {
  if (value === undefined) {
    return DeliveryMode.BEST_EFFORT;
  }
  const valid = Object.values(DeliveryMode);
  if (!valid.includes(value as DeliveryModeValue)) {
    throw new Error(
      `Invalid deliveryMode "${value}" for namespace ${namespacePath} (expected: ${valid.join(', ')})`,
    );
  }
  return value as DeliveryModeValue;
}

function parseOverflowAction(value: string | undefined, namespacePath: string): OverflowActionValue {
  if (value === undefined) {
    return OverflowAction.REJECT_NEW;
  }
  const valid = Object.values(OverflowAction);
  if (!valid.includes(value as OverflowActionValue)) {
    throw new Error(
      `Invalid overflowAction "${value}" for namespace ${namespacePath} (expected: ${valid.join(', ')})`,
    );
  }
  return value as OverflowActionValue;
}
