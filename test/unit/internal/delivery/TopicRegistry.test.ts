import { describe, expect, it } from 'vitest';
import { TopicRegistry } from '../../../../src/internal/delivery/TopicRegistry.js';

describe('TopicRegistry', () => {
  it('tracks subscriptions by topic and client with deterministic order', () => {
    const registry = new TopicRegistry();

    registry.subscribe('snapshot', 'client-1');
    registry.subscribe('snapshot', 'client-2');
    registry.subscribe('alerts', 'client-1');

    expect(registry.subscribers('snapshot')).toEqual(['client-1', 'client-2']);
    expect(registry.subscribers('alerts')).toEqual(['client-1']);
    expect(registry.topicsFor('client-1')).toEqual(['snapshot', 'alerts']);
    expect(Object.isFrozen(registry.subscribers('snapshot'))).toBe(true);
    expect(Object.isFrozen(registry.topicsFor('client-1'))).toBe(true);
  });

  it('treats duplicate subscriptions as idempotent', () => {
    const registry = new TopicRegistry();

    registry.subscribe('snapshot', 'client-1');
    registry.subscribe('snapshot', 'client-1');

    expect(registry.subscribers('snapshot')).toEqual(['client-1']);
    expect(registry.topicsFor('client-1')).toEqual(['snapshot']);
  });

  it('supports unsubscribe and unsubscribeAll cleanup', () => {
    const registry = new TopicRegistry();

    registry.subscribe('snapshot', 'client-1');
    registry.subscribe('alerts', 'client-1');
    registry.subscribe('snapshot', 'client-2');

    expect(registry.unsubscribe('snapshot', 'client-1')).toBe(true);
    expect(registry.unsubscribe('snapshot', 'client-1')).toBe(false);
    expect(registry.subscribers('snapshot')).toEqual(['client-2']);

    registry.unsubscribeAll('client-1');

    expect(registry.topicsFor('client-1')).toEqual([]);
    expect(registry.subscribers('alerts')).toEqual([]);
  });
});
