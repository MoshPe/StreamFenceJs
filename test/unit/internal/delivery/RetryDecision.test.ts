import { describe, expect, it } from 'vitest';
import {
  RetryAction,
  createRetryDecision,
} from '../../../../src/internal/delivery/RetryDecision.js';
import { makeLaneEntry } from './helpers.js';

describe('RetryAction', () => {
  it('exposes RETRY and EXHAUSTED', () => {
    expect(RetryAction.RETRY).toBe('RETRY');
    expect(RetryAction.EXHAUSTED).toBe('EXHAUSTED');
  });
});

describe('createRetryDecision', () => {
  it('creates an immutable retry decision', () => {
    const decision = createRetryDecision({
      action: RetryAction.RETRY,
      clientId: 'client-1',
      namespace: '/feed',
      topic: 'snapshot',
      pendingMessage: makeLaneEntry(),
    });

    expect(decision.action).toBe(RetryAction.RETRY);
    expect(decision.clientId).toBe('client-1');
    expect(decision.topic).toBe('snapshot');
    expect(Object.isFrozen(decision)).toBe(true);
  });
});
