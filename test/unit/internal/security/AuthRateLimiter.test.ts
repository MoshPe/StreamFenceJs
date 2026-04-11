import { describe, expect, it } from 'vitest';
import { AuthRateLimiter } from '../../../../src/internal/security/AuthRateLimiter.js';

describe('AuthRateLimiter', () => {
  it('blocks after threshold failures and unblocks after cooldown', () => {
    let now = 1000;
    const limiter = new AuthRateLimiter({
      maxFailures: 2,
      cooldownMs: 500,
      now: () => now,
    });

    expect(limiter.isLimited('10.0.0.1')).toBe(false);

    limiter.recordFailure('10.0.0.1');
    expect(limiter.isLimited('10.0.0.1')).toBe(false);

    limiter.recordFailure('10.0.0.1');
    expect(limiter.isLimited('10.0.0.1')).toBe(true);

    now += 501;

    expect(limiter.isLimited('10.0.0.1')).toBe(false);
  });

  it('recordSuccess clears failure state', () => {
    const limiter = new AuthRateLimiter({ maxFailures: 1, cooldownMs: 1000 });

    limiter.recordFailure('10.0.0.2');
    expect(limiter.isLimited('10.0.0.2')).toBe(true);

    limiter.recordSuccess('10.0.0.2');
    expect(limiter.isLimited('10.0.0.2')).toBe(false);
  });
});
