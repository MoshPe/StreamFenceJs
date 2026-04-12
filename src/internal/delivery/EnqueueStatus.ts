export const EnqueueStatus = {
  ACCEPTED: 'ACCEPTED',
  COALESCED: 'COALESCED',
  DROPPED_OLDEST_AND_ACCEPTED: 'DROPPED_OLDEST_AND_ACCEPTED',
  REPLACED_SNAPSHOT: 'REPLACED_SNAPSHOT',
  REJECTED: 'REJECTED',
} as const;

export type EnqueueStatusValue = (typeof EnqueueStatus)[keyof typeof EnqueueStatus];
