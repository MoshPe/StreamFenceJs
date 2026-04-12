import { describe, expect, it } from 'vitest';
import type { InboundMessageContext } from '../../src/InboundMessageContext.js';
import { NamespaceSpec } from '../../src/NamespaceSpec.js';
import { StreamFenceServerBuilder } from '../../src/StreamFenceServerBuilder.js';

describe('StreamFenceServer', () => {
  it('start is idempotent and stop is safe before start', async () => {
    const namespace = NamespaceSpec.builder('/feed').topic('snapshot').build();
    const server = new StreamFenceServerBuilder().namespace(namespace).buildServer();

    await expect(server.stop()).resolves.toBeUndefined();
    await expect(server.start()).resolves.toBeUndefined();
    await expect(server.start()).resolves.toBeUndefined();
    await expect(server.stop()).resolves.toBeUndefined();
  });

  it('registers inbound handlers and exposes configured metrics', () => {
    const namespace = NamespaceSpec.builder('/feed').topic('snapshot').build();
    const server = new StreamFenceServerBuilder().namespace(namespace).buildServer();

    const handler = (_payload: unknown, _context: InboundMessageContext) => undefined;

    expect(() => server.onMessage('/feed', 'snapshot', handler)).not.toThrow();
    expect(server.metrics()).toBeDefined();
    expect(() => server.publish('/feed', 'snapshot', { value: 1 })).not.toThrow();
    expect(() =>
      server.publishTo('/feed', 'client-1', 'snapshot', { value: 2 }),
    ).not.toThrow();
  });
});
