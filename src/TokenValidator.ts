import type { AuthDecision } from './AuthDecision.js';

/**
 * Strategy interface for token-based client authentication.
 *
 * Implement this interface and register it via the server builder's `.tokenValidator()`
 * method to perform custom auth logic. The server invokes `validate()` during the
 * Socket.IO handshake for every namespace configured with `AuthMode.TOKEN`.
 *
 * Implementations must be safe to call from multiple sockets concurrently. Exceptions
 * thrown from `validate()` are caught by the server and treated as a rejection.
 *
 * Mirrors `io.streamfence.TokenValidator` in the parent Java library.
 */
export interface TokenValidator {
  /**
   * Validates a bearer token for a connecting client.
   *
   * @param token the raw token string supplied by the client; never null
   * @param namespace the namespace path the client is connecting to
   * @param topic the topic the client is attempting to access, or `null` if the check
   *              is at connection time rather than subscription time
   * @returns an `AuthDecision` indicating acceptance or rejection; must not be null.
   *          May return a `Promise<AuthDecision>` if the validator needs async I/O
   *          (e.g. a database or remote introspection call).
   */
  validate(
    token: string,
    namespace: string,
    topic: string | null,
  ): AuthDecision | Promise<AuthDecision>;
}
