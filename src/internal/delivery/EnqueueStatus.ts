export const EnqueueStatus = {
  ACCEPTED: 'ACCEPTED',
  DROPPED_OLD: 'DROPPED_OLD',
  REJECTED: 'REJECTED',
  SPILLED: 'SPILLED',
  DISCONNECTED: 'DISCONNECTED',
} as const;

export type EnqueueStatusValue = (typeof EnqueueStatus)[keyof typeof EnqueueStatus];
