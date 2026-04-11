export const RetryAction = {
  RETRY: 'RETRY',
  EXHAUSTED: 'EXHAUSTED',
} as const;

export type RetryActionValue = (typeof RetryAction)[keyof typeof RetryAction];
