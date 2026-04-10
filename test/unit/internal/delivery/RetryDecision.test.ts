import { describe, expect, it } from 'vitest';
import {
  RetryAction,
  RetryDecision,
  type RetryDecision as RetryDecisionValue,
} from '../../../../src/internal/delivery/RetryDecision.js';

describe('RetryAction', () => {
  it('exposes RETRY and GIVE_UP', () => {
    expect(RetryAction.RETRY).toBe('RETRY');
    expect(RetryAction.GIVE_UP).toBe('GIVE_UP');
    expect(Object.keys(RetryAction)).toHaveLength(2);
  });
});

describe('RetryDecision', () => {
  it('creates immutable retry decisions with an attempt number and next delay', () => {
    const decision: RetryDecisionValue = RetryDecision.retry(2, 1_500);

    expect(decision.action).toBe(RetryAction.RETRY);
    expect(decision.attempt).toBe(2);
    expect(decision.nextDelayMs).toBe(1_500);
    expect(Object.isFrozen(decision)).toBe(true);
  });

  it('creates immutable give-up decisions without a next delay', () => {
    const decision = RetryDecision.giveUp(4);

    expect(decision.action).toBe(RetryAction.GIVE_UP);
    expect(decision.attempt).toBe(4);
    expect(decision.nextDelayMs).toBeNull();
    expect(Object.isFrozen(decision)).toBe(true);
  });

  it('rejects negative attempts or retry delays', () => {
    expect(() => RetryDecision.retry(0, 100)).toThrow('attempt must be positive');
    expect(() => RetryDecision.retry(1, -1)).toThrow('nextDelayMs must be zero or positive');
    expect(() => RetryDecision.giveUp(0)).toThrow('attempt must be positive');
  });
});
