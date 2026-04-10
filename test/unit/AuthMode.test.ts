import { describe, expect, it } from 'vitest';
import { AuthMode, type AuthModeValue } from '../../src/AuthMode.js';

describe('AuthMode', () => {
  it('has NONE and TOKEN members matching the Java enum', () => {
    expect(AuthMode.NONE).toBe('NONE');
    expect(AuthMode.TOKEN).toBe('TOKEN');
  });

  it('exposes exactly two members', () => {
    expect(Object.keys(AuthMode)).toHaveLength(2);
  });

  it('is assignable to the AuthModeValue union type', () => {
    const modes: AuthModeValue[] = [AuthMode.NONE, AuthMode.TOKEN];
    expect(modes).toHaveLength(2);
  });
});
