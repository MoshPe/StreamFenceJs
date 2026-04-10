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

describe('NamespaceSpec - basic field validation', () => {
  const valid = () => NamespaceSpec.builder('/x').topic('t');

  it('rejects a path that does not start with "/"', () => {
    expect(() => NamespaceSpec.builder('feed').topic('t').build()).toThrow(
      "namespace path must start with '/'",
    );
  });

  it('rejects a blank path', () => {
    expect(() => NamespaceSpec.builder('').topic('t').build()).toThrow(
      "namespace path must start with '/'",
    );
  });

  it('rejects an empty topic list', () => {
    expect(() => NamespaceSpec.builder('/x').build()).toThrow(
      'namespace must define at least one topic',
    );
  });

  it('rejects a blank topic name', () => {
    expect(() => NamespaceSpec.builder('/x').topics(['', 'valid']).build()).toThrow(
      'topic names must not be blank in namespace /x',
    );
  });

  it('rejects a whitespace-only topic name', () => {
    expect(() => NamespaceSpec.builder('/x').topics(['   ']).build()).toThrow(
      'topic names must not be blank in namespace /x',
    );
  });

  it('rejects duplicate topic names', () => {
    expect(() => NamespaceSpec.builder('/x').topics(['a', 'b', 'a']).build()).toThrow(
      'duplicate topic in namespace /x: a',
    );
  });

  it('rejects non-positive maxQueuedMessagesPerClient', () => {
    expect(() => valid().maxQueuedMessagesPerClient(0).build()).toThrow(
      'maxQueuedMessagesPerClient must be positive',
    );
    expect(() => valid().maxQueuedMessagesPerClient(-1).build()).toThrow(
      'maxQueuedMessagesPerClient must be positive',
    );
  });

  it('rejects non-positive maxQueuedBytesPerClient', () => {
    expect(() => valid().maxQueuedBytesPerClient(0).build()).toThrow(
      'maxQueuedBytesPerClient must be positive',
    );
  });

  it('rejects non-positive ackTimeoutMs', () => {
    expect(() => valid().ackTimeoutMs(0).build()).toThrow('ackTimeoutMs must be positive');
  });

  it('rejects negative maxRetries', () => {
    expect(() => valid().maxRetries(-1).build()).toThrow('maxRetries must be zero or positive');
  });

  it('normalizes non-positive maxInFlight to 1', () => {
    const spec = valid().maxInFlight(0).build();
    expect(spec.maxInFlight).toBe(1);
  });
});

describe('NamespaceSpec - AT_LEAST_ONCE cross-field rules', () => {
  const reliable = () =>
    NamespaceSpec.builder('/r')
      .topic('t')
      .deliveryMode(DeliveryMode.AT_LEAST_ONCE)
      .maxRetries(3);

  it('requires overflowAction = REJECT_NEW', () => {
    expect(() => reliable().overflowAction(OverflowAction.DROP_OLDEST).build()).toThrow(
      'AT_LEAST_ONCE namespaces must use REJECT_NEW overflowAction',
    );
    expect(() => reliable().overflowAction(OverflowAction.COALESCE).build()).toThrow(
      'AT_LEAST_ONCE namespaces must use REJECT_NEW overflowAction',
    );
    expect(() => reliable().overflowAction(OverflowAction.SNAPSHOT_ONLY).build()).toThrow(
      'AT_LEAST_ONCE namespaces must use REJECT_NEW overflowAction',
    );
  });

  it('forbids coalesce = true', () => {
    expect(() => reliable().coalesce(true).build()).toThrow(
      'AT_LEAST_ONCE namespaces cannot enable coalescing',
    );
  });

  it('requires maxRetries > 0', () => {
    expect(() =>
      NamespaceSpec.builder('/r')
        .topic('t')
        .deliveryMode(DeliveryMode.AT_LEAST_ONCE)
        .maxRetries(0)
        .build(),
    ).toThrow('AT_LEAST_ONCE namespaces must allow at least one retry');
  });

  it('rejects maxInFlight > maxQueuedMessagesPerClient', () => {
    expect(() =>
      reliable().maxQueuedMessagesPerClient(4).maxInFlight(8).build(),
    ).toThrow('maxInFlight must not exceed maxQueuedMessagesPerClient');
  });

  it('accepts a fully valid AT_LEAST_ONCE configuration', () => {
    const spec = reliable()
      .overflowAction(OverflowAction.REJECT_NEW)
      .maxQueuedMessagesPerClient(32)
      .maxInFlight(8)
      .ackTimeoutMs(2000)
      .build();

    expect(spec.deliveryMode).toBe(DeliveryMode.AT_LEAST_ONCE);
    expect(spec.maxInFlight).toBe(8);
  });

  it('BEST_EFFORT namespaces do not enforce the AT_LEAST_ONCE cross-field rules', () => {
    expect(() => NamespaceSpec.builder('/b').topic('t').coalesce(true).build()).not.toThrow();
    expect(() =>
      NamespaceSpec.builder('/b').topic('t').overflowAction(OverflowAction.DROP_OLDEST).build(),
    ).not.toThrow();
    expect(() =>
      NamespaceSpec.builder('/b')
        .topic('t')
        .maxQueuedMessagesPerClient(4)
        .maxInFlight(8)
        .build(),
    ).not.toThrow();
  });
});
