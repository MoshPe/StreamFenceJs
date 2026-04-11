import { describe, expect, it } from 'vitest';
import { NamespaceSpec } from '../../src/NamespaceSpec.js';
import { StreamFenceServerBuilder } from '../../src/StreamFenceServerBuilder.js';

describe('StreamFenceServerBuilder', () => {
  it('rejects duplicate namespace paths', () => {
    const first = NamespaceSpec.builder('/feed').topic('snapshot').build();
    const second = NamespaceSpec.builder('/feed').topic('alerts').build();

    expect(() =>
      new StreamFenceServerBuilder().namespace(first).namespace(second),
    ).toThrow('duplicate namespace path: /feed');
  });

  it('refuses to build a server without at least one namespace', () => {
    expect(() => new StreamFenceServerBuilder().buildServer()).toThrow(
      'StreamFenceServer requires at least one namespace',
    );
  });
});
