import { describe, expect, it } from 'vitest';
import { mapServerConfig } from '../../../../src/internal/config/SpecMapper.js';
import type { RawServerConfig } from '../../../../src/internal/config/RawServerConfig.js';
import { DeliveryMode } from '../../../../src/DeliveryMode.js';
import { OverflowAction } from '../../../../src/OverflowAction.js';
import { TransportMode } from '../../../../src/TransportMode.js';
import { EngineIoTransportMode } from '../../../../src/EngineIoTransportMode.js';
import { AuthMode } from '../../../../src/AuthMode.js';
import { NoopServerMetrics } from '../../../../src/ServerMetrics.js';

function minimalConfig(overrides: Record<string, unknown> = {}): RawServerConfig {
  return {
    servers: {
      feed: {
        port: 3000,
        namespaces: [{ path: '/feed', topics: ['snapshot'] }],
        ...overrides,
      },
    },
  };
}

describe('mapServerConfig - server selection', () => {
  it('maps a named server from the config', () => {
    const spec = mapServerConfig(minimalConfig(), 'feed');
    expect(spec.port).toBe(3000);
  });

  it('throws a descriptive error when the server name is not found', () => {
    const config: RawServerConfig = {
      servers: {
        feed: { port: 3000, namespaces: [{ path: '/feed', topics: ['s'] }] },
        control: { port: 3001, namespaces: [{ path: '/ctrl', topics: ['c'] }] },
      },
    };
    expect(() => mapServerConfig(config, 'missing')).toThrow(
      'No server named "missing" found in config (available: feed, control)',
    );
  });
});

describe('mapServerConfig - server-level defaults', () => {
  it('applies default host when absent', () => {
    const spec = mapServerConfig(minimalConfig(), 'feed');
    expect(spec.host).toBe('0.0.0.0');
  });

  it('applies default managementPort of null when absent', () => {
    const spec = mapServerConfig(minimalConfig(), 'feed');
    expect(spec.managementPort).toBeNull();
  });

  it('applies default transportMode of WS when absent', () => {
    const spec = mapServerConfig(minimalConfig(), 'feed');
    expect(spec.transportMode).toBe(TransportMode.WS);
  });

  it('applies default engineIoTransportMode of WEBSOCKET_OR_POLLING when absent', () => {
    const spec = mapServerConfig(minimalConfig(), 'feed');
    expect(spec.engineIoTransportMode).toBe(EngineIoTransportMode.WEBSOCKET_OR_POLLING);
  });

  it('applies default authMode of NONE when absent', () => {
    const spec = mapServerConfig(minimalConfig(), 'feed');
    expect(spec.authMode).toBe(AuthMode.NONE);
  });

  it('applies default spillRootPath when absent', () => {
    const spec = mapServerConfig(minimalConfig(), 'feed');
    expect(spec.spillRootPath).toBe('.streamfence-spill');
  });

  it('defaults tlsConfig to null when tls block is absent', () => {
    const spec = mapServerConfig(minimalConfig(), 'feed');
    expect(spec.tlsConfig).toBeNull();
  });

  it('defaults listeners to empty array', () => {
    const spec = mapServerConfig(minimalConfig(), 'feed');
    expect(spec.listeners).toHaveLength(0);
  });

  it('defaults metrics to NoopServerMetrics', () => {
    const spec = mapServerConfig(minimalConfig(), 'feed');
    expect(spec.metrics).toBeInstanceOf(NoopServerMetrics);
  });
});

describe('mapServerConfig - server-level field mapping', () => {
  it('maps an explicit host', () => {
    const spec = mapServerConfig(minimalConfig({ host: '127.0.0.1' }), 'feed');
    expect(spec.host).toBe('127.0.0.1');
  });

  it('maps an explicit managementPort', () => {
    const spec = mapServerConfig(minimalConfig({ managementPort: 9100 }), 'feed');
    expect(spec.managementPort).toBe(9100);
  });

  it('maps transport: WSS', () => {
    const spec = mapServerConfig(minimalConfig({ transport: 'WSS' }), 'feed');
    expect(spec.transportMode).toBe(TransportMode.WSS);
  });

  it('maps engineIoTransport: WEBSOCKET_ONLY', () => {
    const spec = mapServerConfig(
      minimalConfig({ engineIoTransport: 'WEBSOCKET_ONLY' }),
      'feed',
    );
    expect(spec.engineIoTransportMode).toBe(EngineIoTransportMode.WEBSOCKET_ONLY);
  });

  it('maps auth: TOKEN', () => {
    const spec = mapServerConfig(minimalConfig({ auth: 'TOKEN' }), 'feed');
    expect(spec.authMode).toBe(AuthMode.TOKEN);
  });

  it('maps spillRootPath', () => {
    const spec = mapServerConfig(minimalConfig({ spillRootPath: '/var/spill' }), 'feed');
    expect(spec.spillRootPath).toBe('/var/spill');
  });

  it('maps a tls block to TlsConfig', () => {
    const spec = mapServerConfig(
      minimalConfig({
        tls: {
          certChainPemPath: '/etc/ssl/cert.pem',
          privateKeyPemPath: '/etc/ssl/key.pem',
          protocol: 'TLSv1.3',
        },
      }),
      'feed',
    );
    expect(spec.tlsConfig).not.toBeNull();
    expect(spec.tlsConfig?.certChainPemPath).toBe('/etc/ssl/cert.pem');
    expect(spec.tlsConfig?.protocol).toBe('TLSv1.3');
  });
});

describe('mapServerConfig - enum validation errors', () => {
  it('throws for invalid transport value', () => {
    expect(() => mapServerConfig(minimalConfig({ transport: 'QUIC' }), 'feed')).toThrow(
      'Invalid transport "QUIC" (expected: WS, WSS)',
    );
  });

  it('throws for invalid engineIoTransport value', () => {
    expect(() =>
      mapServerConfig(minimalConfig({ engineIoTransport: 'POLLING_ONLY' }), 'feed'),
    ).toThrow('Invalid engineIoTransport "POLLING_ONLY" (expected: WEBSOCKET_ONLY, WEBSOCKET_OR_POLLING)');
  });

  it('throws for invalid auth value', () => {
    expect(() => mapServerConfig(minimalConfig({ auth: 'OAUTH' }), 'feed')).toThrow(
      'Invalid auth "OAUTH" (expected: NONE, TOKEN)',
    );
  });

  it('throws for invalid deliveryMode on a namespace', () => {
    const config: RawServerConfig = {
      servers: {
        feed: {
          port: 3000,
          namespaces: [{ path: '/feed', topics: ['s'], deliveryMode: 'ONCE' }],
        },
      },
    };
    expect(() => mapServerConfig(config, 'feed')).toThrow(
      'Invalid deliveryMode "ONCE" for namespace /feed (expected: BEST_EFFORT, AT_LEAST_ONCE)',
    );
  });

  it('throws for invalid overflowAction on a namespace', () => {
    const config: RawServerConfig = {
      servers: {
        feed: {
          port: 3000,
          namespaces: [{ path: '/feed', topics: ['s'], overflowAction: 'DISCARD' }],
        },
      },
    };
    expect(() => mapServerConfig(config, 'feed')).toThrow(
      'Invalid overflowAction "DISCARD" for namespace /feed (expected: DROP_OLDEST, REJECT_NEW, COALESCE, SNAPSHOT_ONLY, SPILL_TO_DISK)',
    );
  });
});

describe('mapServerConfig - namespace mapping', () => {
  it('maps namespace path and topics', () => {
    const spec = mapServerConfig(minimalConfig(), 'feed');
    expect(spec.namespaces).toHaveLength(1);
    expect(spec.namespaces[0]?.path).toBe('/feed');
    expect(spec.namespaces[0]?.topics).toEqual(['snapshot']);
  });

  it('applies NamespaceSpec defaults when optional namespace fields are absent', () => {
    const spec = mapServerConfig(minimalConfig(), 'feed');
    const ns = spec.namespaces[0];
    expect(ns?.deliveryMode).toBe(DeliveryMode.BEST_EFFORT);
    expect(ns?.overflowAction).toBe(OverflowAction.REJECT_NEW);
    expect(ns?.maxQueuedMessagesPerClient).toBe(64);
    expect(ns?.maxQueuedBytesPerClient).toBe(524_288);
    expect(ns?.ackTimeoutMs).toBe(1000);
    expect(ns?.maxRetries).toBe(0);
    expect(ns?.coalesce).toBe(false);
    expect(ns?.allowPolling).toBe(true);
    expect(ns?.maxInFlight).toBe(1);
    expect(ns?.authRequired).toBe(false);
  });

  it('maps all optional namespace fields when present', () => {
    const config: RawServerConfig = {
      servers: {
        feed: {
          port: 3000,
          namespaces: [
            {
              path: '/feed',
              topics: ['a', 'b'],
              deliveryMode: 'BEST_EFFORT',
              overflowAction: 'DROP_OLDEST',
              maxQueuedMessagesPerClient: 200,
              maxQueuedBytesPerClient: 2_000_000,
              ackTimeoutMs: 5000,
              maxRetries: 0,
              coalesce: true,
              allowPolling: false,
              maxInFlight: 1,
              authRequired: true,
            },
          ],
        },
      },
    };
    const spec = mapServerConfig(config, 'feed');
    const ns = spec.namespaces[0];
    expect(ns?.overflowAction).toBe(OverflowAction.DROP_OLDEST);
    expect(ns?.maxQueuedMessagesPerClient).toBe(200);
    expect(ns?.coalesce).toBe(true);
    expect(ns?.authRequired).toBe(true);
  });

  it('rejects duplicate namespace paths', () => {
    const config: RawServerConfig = {
      servers: {
        feed: {
          port: 3000,
          namespaces: [
            { path: '/feed', topics: ['a'] },
            { path: '/feed', topics: ['b'] },
          ],
        },
      },
    };
    expect(() => mapServerConfig(config, 'feed')).toThrow(
      'Duplicate namespace path "/feed" in server "feed"',
    );
  });

  it('propagates NamespaceSpec validation errors (AT_LEAST_ONCE + wrong overflow)', () => {
    const config: RawServerConfig = {
      servers: {
        feed: {
          port: 3000,
          namespaces: [
            {
              path: '/feed',
              topics: ['s'],
              deliveryMode: 'AT_LEAST_ONCE',
              overflowAction: 'DROP_OLDEST',
              maxRetries: 3,
            },
          ],
        },
      },
    };
    expect(() => mapServerConfig(config, 'feed')).toThrow(
      'AT_LEAST_ONCE namespaces must use REJECT_NEW overflowAction',
    );
  });
});
