import { describe, expect, it } from 'vitest';
import { NamespaceSpec } from '../../src/NamespaceSpec.js';
import { DeliveryMode } from '../../src/DeliveryMode.js';
import { OverflowAction } from '../../src/OverflowAction.js';

describe('NamespaceSpec - builder happy path', () => {
  it('builds a spec with all defaults when only path + one topic are set', () => {
    const spec = NamespaceSpec.builder('/feed').topic('snapshot').build();
    expect(spec.path).toBe('/feed');
    expect(spec.topics).toEqual(['snapshot']);
    expect(spec.authRequired).toBe(false);
    expect(spec.deliveryMode).toBe(DeliveryMode.BEST_EFFORT);
    expect(spec.overflowAction).toBe(OverflowAction.REJECT_NEW);
    expect(spec.maxQueuedMessagesPerClient).toBe(64);
    expect(spec.maxQueuedBytesPerClient).toBe(524_288);
    expect(spec.ackTimeoutMs).toBe(1000);
    expect(spec.maxRetries).toBe(0);
    expect(spec.coalesce).toBe(false);
    expect(spec.allowPolling).toBe(true);
    expect(spec.maxInFlight).toBe(1);
  });

  it('allows every field to be overridden via the fluent builder', () => {
    const spec = NamespaceSpec.builder('/control')
      .authRequired(true)
      .topics(['alert', 'command'])
      .deliveryMode(DeliveryMode.AT_LEAST_ONCE)
      .overflowAction(OverflowAction.REJECT_NEW)
      .maxQueuedMessagesPerClient(256)
      .maxQueuedBytesPerClient(1_048_576)
      .ackTimeoutMs(2000)
      .maxRetries(5)
      .coalesce(false)
      .allowPolling(false)
      .maxInFlight(4)
      .build();

    expect(spec.path).toBe('/control');
    expect(spec.authRequired).toBe(true);
    expect(spec.topics).toEqual(['alert', 'command']);
    expect(spec.deliveryMode).toBe(DeliveryMode.AT_LEAST_ONCE);
    expect(spec.overflowAction).toBe(OverflowAction.REJECT_NEW);
    expect(spec.maxQueuedMessagesPerClient).toBe(256);
    expect(spec.maxQueuedBytesPerClient).toBe(1_048_576);
    expect(spec.ackTimeoutMs).toBe(2000);
    expect(spec.maxRetries).toBe(5);
    expect(spec.allowPolling).toBe(false);
    expect(spec.maxInFlight).toBe(4);
  });

  it('the topics array on a built spec is a defensive copy (cannot be mutated)', () => {
    const source = ['a', 'b'];
    const spec = NamespaceSpec.builder('/x').topics(source).build();
    source.push('c');
    expect(spec.topics).toEqual(['a', 'b']);
    expect(() => (spec.topics as unknown as string[]).push('z')).toThrow();
  });

  it('the built spec itself is frozen', () => {
    const spec = NamespaceSpec.builder('/x').topic('t').build();
    expect(Object.isFrozen(spec)).toBe(true);
  });
});
