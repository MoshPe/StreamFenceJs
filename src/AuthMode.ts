/**
 * Authentication mode for a namespace.
 *
 * Mirrors `io.streamfence.AuthMode` in the parent Java library.
 */
export const AuthMode = {
  /** No token-based authentication is required for the namespace. */
  NONE: 'NONE',

  /** Clients must present a token that is validated by a `TokenValidator`. */
  TOKEN: 'TOKEN',
} as const;

export type AuthModeValue = (typeof AuthMode)[keyof typeof AuthMode];
