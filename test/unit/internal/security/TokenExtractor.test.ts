import { describe, expect, it } from 'vitest';
import {
  extractTokenFromHandshake,
  type HandshakeLike,
} from '../../../../src/internal/security/TokenExtractor.js';

describe('TokenExtractor', () => {
  it('prefers handshake.auth.token over Authorization header', () => {
    const handshake: HandshakeLike = {
      auth: { token: 'auth-token' },
      headers: { authorization: 'Bearer header-token' },
    };

    expect(extractTokenFromHandshake(handshake)).toBe('auth-token');
  });

  it('falls back to Bearer Authorization header when auth token is absent', () => {
    const handshake: HandshakeLike = {
      headers: { authorization: 'Bearer header-token' },
    };

    expect(extractTokenFromHandshake(handshake)).toBe('header-token');
  });

  it('returns null for missing or malformed token sources', () => {
    expect(extractTokenFromHandshake({})).toBeNull();
    expect(
      extractTokenFromHandshake({
        headers: { authorization: 'Basic abc' },
      }),
    ).toBeNull();
  });
});
