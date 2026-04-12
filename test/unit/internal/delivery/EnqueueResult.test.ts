import { describe, expect, it } from 'vitest';
import {
  EnqueueStatus,
  createEnqueueResult,
} from '../../../../src/internal/delivery/EnqueueResult.js';

describe('EnqueueStatus', () => {
  it('exposes the plan 2 statuses', () => {
    expect(EnqueueStatus.ACCEPTED).toBe('ACCEPTED');
    expect(EnqueueStatus.COALESCED).toBe('COALESCED');
    expect(EnqueueStatus.DROPPED_OLDEST_AND_ACCEPTED).toBe(
      'DROPPED_OLDEST_AND_ACCEPTED',
    );
    expect(EnqueueStatus.REPLACED_SNAPSHOT).toBe('REPLACED_SNAPSHOT');
    expect(EnqueueStatus.REJECTED).toBe('REJECTED');
  });
});

describe('createEnqueueResult', () => {
  it('creates an immutable status and reason pair', () => {
    const result = createEnqueueResult({
      status: EnqueueStatus.COALESCED,
      reason: 'coalesced by key',
    });

    expect(result.status).toBe(EnqueueStatus.COALESCED);
    expect(result.reason).toBe('coalesced by key');
    expect(Object.isFrozen(result)).toBe(true);
  });
});
