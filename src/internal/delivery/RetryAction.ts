export const RetryAction = {
  RETRY: 'RETRY',
  GIVE_UP: 'GIVE_UP',
} as const;

export type RetryActionValue = (typeof RetryAction)[keyof typeof RetryAction];
