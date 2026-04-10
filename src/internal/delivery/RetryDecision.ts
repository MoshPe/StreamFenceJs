import { RetryAction, type RetryActionValue } from './RetryAction.js';

export interface RetryDecision {
  readonly action: RetryActionValue;
  readonly attempt: number;
  readonly nextDelayMs: number | null;
}

function requirePositiveAttempt(attempt: number): void {
  if (attempt <= 0) {
    throw new Error('attempt must be positive');
  }
}

export const RetryDecision = Object.freeze({
  retry(attempt: number, nextDelayMs: number): RetryDecision {
    requirePositiveAttempt(attempt);

    if (nextDelayMs < 0) {
      throw new Error('nextDelayMs must be zero or positive');
    }

    return Object.freeze({
      action: RetryAction.RETRY,
      attempt,
      nextDelayMs,
    });
  },

  giveUp(attempt: number): RetryDecision {
    requirePositiveAttempt(attempt);

    return Object.freeze({
      action: RetryAction.GIVE_UP,
      attempt,
      nextDelayMs: null,
    });
  },
});

export { RetryAction };
export type { RetryActionValue };
