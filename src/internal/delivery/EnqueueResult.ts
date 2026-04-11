import {
  EnqueueStatus,
  type EnqueueStatusValue,
} from './EnqueueStatus.js';

export interface EnqueueResult {
  readonly status: EnqueueStatusValue;
  readonly reason: string;
}

export function createEnqueueResult(input: {
  status: EnqueueStatusValue;
  reason: string;
}): EnqueueResult {
  return Object.freeze({
    status: input.status,
    reason: input.reason,
  });
}

export { EnqueueStatus };
export type { EnqueueStatusValue };
