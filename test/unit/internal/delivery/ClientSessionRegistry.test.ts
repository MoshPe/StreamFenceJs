import { describe, expect, it } from 'vitest';
import {
  ClientSessionRegistry,
  createClientSessionState,
  type ClientSessionState,
} from '../../../../src/internal/delivery/ClientSessionRegistry.js';
import { TopicRegistry } from '../../../../src/internal/delivery/TopicRegistry.js';

function session(input: {
  clientId: string;
  subscriptions?: readonly string[];
  principal?: string | null;
}): ClientSessionState {
  return createClientSessionState({
    namespace: '/feed',
    clientId: input.clientId,
    subscriptions: input.subscriptions ?? [],
    lane: null,
    principal: input.principal ?? null,
    connectedAtMs: 1_700_000_000_000,
  });
}

describe('ClientSessionRegistry', () => {
  it('registers, reads, lists, and removes sessions in insertion order', () => {
    const registry = new ClientSessionRegistry('/feed');
    const first = session({ clientId: 'client-1' });
    const second = session({ clientId: 'client-2' });

    registry.register(first);
    registry.register(second);

    expect(registry.has('client-1')).toBe(true);
    expect(registry.get('client-2')?.clientId).toBe('client-2');
    expect(registry.list().map((item) => item.clientId)).toEqual(['client-1', 'client-2']);

    const removed = registry.remove('client-1');
    expect(removed?.clientId).toBe('client-1');
    expect(registry.has('client-1')).toBe(false);
    expect(registry.list().map((item) => item.clientId)).toEqual(['client-2']);
  });

  it('throws on duplicate register unless replace is explicitly enabled', () => {
    const registry = new ClientSessionRegistry('/feed');
    const original = session({ clientId: 'client-1', principal: 'alpha' });
    const replacement = session({ clientId: 'client-1', principal: 'beta' });

    registry.register(original);

    expect(() => registry.register(replacement)).toThrow(
      'session already registered for client client-1 in namespace /feed',
    );

    registry.register(replacement, { replace: true });

    expect(registry.get('client-1')?.principal).toBe('beta');
  });

  it('disconnect removes the session and unsubscribes it from every topic', () => {
    const registry = new ClientSessionRegistry('/feed');
    const topics = new TopicRegistry();
    const existing = session({
      clientId: 'client-1',
      subscriptions: ['snapshot', 'alerts'],
    });

    registry.register(existing);
    topics.subscribe('snapshot', 'client-1');
    topics.subscribe('alerts', 'client-1');
    topics.subscribe('snapshot', 'client-2');

    const disconnected = registry.disconnect('client-1', topics);

    expect(disconnected?.clientId).toBe('client-1');
    expect(registry.has('client-1')).toBe(false);
    expect(topics.subscribers('snapshot')).toEqual(['client-2']);
    expect(topics.subscribers('alerts')).toEqual([]);
    expect(topics.topicsFor('client-1')).toEqual([]);
  });
});
