import { describe, expect, it } from 'vitest';
import { AuthMode } from '../../src/AuthMode.js';
import { EngineIoTransportMode } from '../../src/EngineIoTransportMode.js';
import { NamespaceSpec } from '../../src/NamespaceSpec.js';
import { NoopServerMetrics } from '../../src/ServerMetrics.js';
import { StreamFenceServerBuilder } from '../../src/StreamFenceServerBuilder.js';
import { TransportMode } from '../../src/TransportMode.js';

describe('StreamFenceServerSpec', () => {
  it('builds an immutable spec with expected defaults', () => {
    const namespace = NamespaceSpec.builder('/feed').topic('snapshot').build();

    const spec = new StreamFenceServerBuilder().namespace(namespace).buildSpec();

    expect(spec.host).toBe('0.0.0.0');
    expect(spec.port).toBe(0);
    expect(spec.transportMode).toBe(TransportMode.WS);
    expect(spec.engineIoTransportMode).toBe(EngineIoTransportMode.WEBSOCKET_OR_POLLING);
    expect(spec.authMode).toBe(AuthMode.NONE);
    expect(spec.tokenValidator).toBeNull();
    expect(spec.tlsConfig).toBeNull();
    expect(spec.listeners).toEqual([]);
    expect(spec.metrics).toBeInstanceOf(NoopServerMetrics);
    expect(spec.spillRootPath).toBe('.streamfence-spill');
    expect(spec.namespaces).toEqual([namespace]);
    expect(Object.isFrozen(spec)).toBe(true);
    expect(Object.isFrozen(spec.namespaces)).toBe(true);
    expect(Object.isFrozen(spec.listeners)).toBe(true);
  });
});
