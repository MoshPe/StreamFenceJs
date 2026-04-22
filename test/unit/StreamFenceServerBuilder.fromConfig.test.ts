import { describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StreamFenceServerBuilder } from '../../src/StreamFenceServerBuilder.js';
import { TransportMode } from '../../src/TransportMode.js';
import { AuthMode } from '../../src/AuthMode.js';
import { NamespaceSpec } from '../../src/NamespaceSpec.js';
import { PromServerMetrics } from '../../src/PromServerMetrics.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, '../fixtures/config');

describe('StreamFenceServerBuilder.fromYaml', () => {
  it('loads the named server and returns a populated builder', () => {
    const builder = StreamFenceServerBuilder.fromYaml(
      join(fixturesDir, 'streamfence.valid.yaml'),
      { server: 'feed' },
    );
    const spec = builder.buildSpec();
    expect(spec.host).toBe('127.0.0.1');
    expect(spec.port).toBe(3000);
    expect(spec.transportMode).toBe(TransportMode.WS);
    expect(spec.authMode).toBe(AuthMode.NONE);
    expect(spec.namespaces).toHaveLength(1);
    expect(spec.namespaces[0]?.path).toBe('/feed');
    expect(spec.namespaces[0]?.topics).toEqual(['snapshot', 'delta']);
  });

  it('loads the control server correctly', () => {
    const spec = StreamFenceServerBuilder.fromYaml(
      join(fixturesDir, 'streamfence.valid.yaml'),
      { server: 'control' },
    ).buildSpec();
    expect(spec.port).toBe(3001);
    expect(spec.namespaces[0]?.path).toBe('/commands');
  });

  it('allows further customisation after loading — adding a listener', () => {
    const listener = { onServerStarted: () => {} };
    const spec = StreamFenceServerBuilder.fromYaml(
      join(fixturesDir, 'streamfence.minimal.yaml'),
      { server: 'feed' },
    )
      .listener(listener)
      .buildSpec();
    expect(spec.listeners).toHaveLength(1);
    expect(spec.listeners[0]).toBe(listener);
  });

  it('allows replacing metrics after loading', () => {
    const metrics = new PromServerMetrics();
    const spec = StreamFenceServerBuilder.fromYaml(
      join(fixturesDir, 'streamfence.minimal.yaml'),
      { server: 'feed' },
    )
      .metrics(metrics)
      .buildSpec();
    expect(spec.metrics).toBe(metrics);
  });

  it('allows adding an extra namespace after loading', () => {
    const extra = NamespaceSpec.builder('/extra').topic('ping').build();
    const spec = StreamFenceServerBuilder.fromYaml(
      join(fixturesDir, 'streamfence.minimal.yaml'),
      { server: 'feed' },
    )
      .namespace(extra)
      .buildSpec();
    expect(spec.namespaces).toHaveLength(2);
    expect(spec.namespaces[1]?.path).toBe('/extra');
  });

  it('buildServer() throws when the loaded config has no namespaces', () => {
    expect(() => new StreamFenceServerBuilder().buildServer()).toThrow(
      'StreamFenceServer requires at least one namespace',
    );
  });

  it('throws when the named server does not exist in the yaml', () => {
    expect(() =>
      StreamFenceServerBuilder.fromYaml(
        join(fixturesDir, 'streamfence.valid.yaml'),
        { server: 'nonexistent' },
      ),
    ).toThrow('No server named "nonexistent" found in config');
  });
});

describe('StreamFenceServerBuilder.fromJson', () => {
  it('loads a JSON config and returns a populated builder', () => {
    const spec = StreamFenceServerBuilder.fromJson(
      join(fixturesDir, 'streamfence.valid.json'),
      { server: 'feed' },
    ).buildSpec();
    expect(spec.host).toBe('127.0.0.1');
    expect(spec.port).toBe(3000);
    expect(spec.namespaces[0]?.path).toBe('/feed');
  });

  it('loads the control server from JSON', () => {
    const spec = StreamFenceServerBuilder.fromJson(
      join(fixturesDir, 'streamfence.valid.json'),
      { server: 'control' },
    ).buildSpec();
    expect(spec.port).toBe(3001);
  });

  it('throws when the file extension is not .json', () => {
    expect(() =>
      StreamFenceServerBuilder.fromJson(
        join(fixturesDir, 'streamfence.valid.yaml'),
        { server: 'feed' },
      ),
    ).toThrow('Unsupported config file extension');
  });
});
