/**
 * The result of an authentication or authorization check performed by a `TokenValidator`.
 *
 * An accepted decision carries the resolved `principal` name. A rejected decision
 * carries a human-readable `reason` string that is logged and surfaced to the client as
 * an `error` event.
 *
 * Mirrors `io.streamfence.AuthDecision` in the parent Java library.
 */
export interface AuthDecision {
  readonly accepted: boolean;
  readonly principal: string | null;
  readonly reason: string;
}

/**
 * Static factory functions for building immutable `AuthDecision` values. Instances
 * returned from these factories are frozen so they cannot be mutated by callers.
 */
export const AuthDecision = Object.freeze({
  /**
   * Creates an accepted decision with the given principal name.
   *
   * @param principal the resolved identity of the authenticated client
   * @returns an accepted `AuthDecision`
   */
  accept(principal: string): AuthDecision {
    return Object.freeze({ accepted: true, principal, reason: 'accepted' });
  },

  /**
   * Creates a rejected decision with the given reason.
   *
   * @param reason a human-readable explanation for the rejection
   * @returns a rejected `AuthDecision`
   */
  reject(reason: string): AuthDecision {
    return Object.freeze({ accepted: false, principal: null, reason });
  },
});
