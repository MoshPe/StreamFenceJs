import { describe, expect, it } from 'vitest';
import { AuthDecision } from '../../src/AuthDecision.js';

describe('AuthDecision', () => {
  describe('accept()', () => {
    it('creates an accepted decision with the given principal and reason "accepted"', () => {
      const decision = AuthDecision.accept('alice');
      expect(decision.accepted).toBe(true);
      expect(decision.principal).toBe('alice');
      expect(decision.reason).toBe('accepted');
    });
  });

  describe('reject()', () => {
    it('creates a rejected decision with null principal and the given reason', () => {
      const decision = AuthDecision.reject('invalid token');
      expect(decision.accepted).toBe(false);
      expect(decision.principal).toBeNull();
      expect(decision.reason).toBe('invalid token');
    });
  });

  it('freezes the returned object so it cannot be mutated', () => {
    const decision = AuthDecision.accept('bob');
    expect(Object.isFrozen(decision)).toBe(true);
  });
});
