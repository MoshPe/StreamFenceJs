import { describe, expect, it } from 'vitest';
import { DeliveryMode, type DeliveryModeValue } from '../../src/DeliveryMode.js';

describe('DeliveryMode', () => {
  it('has BEST_EFFORT and AT_LEAST_ONCE members matching the Java enum', () => {
    expect(DeliveryMode.BEST_EFFORT).toBe('BEST_EFFORT');
    expect(DeliveryMode.AT_LEAST_ONCE).toBe('AT_LEAST_ONCE');
  });

  it('exposes exactly two members', () => {
    expect(Object.keys(DeliveryMode)).toHaveLength(2);
  });

  it('is assignable to the DeliveryModeValue union type', () => {
    const modes: DeliveryModeValue[] = [DeliveryMode.BEST_EFFORT, DeliveryMode.AT_LEAST_ONCE];
    expect(modes).toHaveLength(2);
  });
});
