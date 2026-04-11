import { describe, expect, it } from 'vitest';
import { StaticTokenValidator } from '../../../../src/internal/security/StaticTokenValidator.js';

describe('StaticTokenValidator', () => {
  it('accepts configured tokens', async () => {
    const validator = new StaticTokenValidator(['alpha', 'beta']);

    const decision = await validator.validate('alpha', '/feed', null);

    expect(decision.accepted).toBe(true);
    expect(decision.principal).toBe('alpha');
  });

  it('rejects unknown tokens', async () => {
    const validator = new StaticTokenValidator(['alpha']);

    const decision = await validator.validate('unknown', '/feed', 'snapshot');

    expect(decision.accepted).toBe(false);
    expect(decision.principal).toBeNull();
    expect(decision.reason).toContain('invalid token');
  });
});
