import { describe, expect, it } from 'vitest';
import { TopicRegistry } from '../../../../src/internal/delivery/TopicRegistry.js';
import { makeTopicPolicy } from './helpers.js';

describe('TopicRegistry', () => {
  it('registers and resolves policies by namespace and topic', () => {
    const registry = new TopicRegistry();
    const policy = makeTopicPolicy({ namespace: '/feed', topic: 'snapshot' });

    registry.register(policy);

    expect(registry.has('/feed', 'snapshot')).toBe(true);
    expect(registry.find('/feed', 'snapshot')).toBe(policy);
    expect(registry.find('/feed', 'missing')).toBeUndefined();
  });

  it('registerAll stores each policy', () => {
    const registry = new TopicRegistry();

    registry.registerAll([
      makeTopicPolicy({ namespace: '/feed', topic: 'snapshot' }),
      makeTopicPolicy({ namespace: '/feed', topic: 'alerts' }),
    ]);

    expect(registry.has('/feed', 'snapshot')).toBe(true);
    expect(registry.has('/feed', 'alerts')).toBe(true);
  });
});
