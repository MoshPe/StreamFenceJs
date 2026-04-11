export interface HandshakeLike {
  auth?: {
    token?: unknown;
  };
  headers?: Record<string, unknown>;
}

export function extractTokenFromHandshake(handshake: HandshakeLike): string | null {
  const authToken = asTokenString(handshake.auth?.token);
  if (authToken !== null) {
    return authToken;
  }

  const headerValue = handshake.headers?.authorization;
  if (typeof headerValue !== 'string') {
    return null;
  }

  const match = /^Bearer\s+(.+)$/i.exec(headerValue.trim());
  if (match === null) {
    return null;
  }

  return asTokenString(match[1]);
}

function asTokenString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const token = value.trim();
  return token === '' ? null : token;
}
