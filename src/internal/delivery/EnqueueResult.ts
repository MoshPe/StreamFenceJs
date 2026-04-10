import {
  EnqueueStatus,
  type EnqueueStatusValue,
} from './EnqueueStatus.js';
import type { LaneEntry } from './LaneEntry.js';

export interface EnqueueResult {
  readonly status: EnqueueStatusValue;
  readonly acceptedEntry: LaneEntry | null;
  readonly droppedEntries: readonly LaneEntry[];
  readonly spilledEntry: LaneEntry | null;
  readonly reason: string | null;
}

export function createEnqueueResult(input: {
  status: EnqueueStatusValue;
  acceptedEntry?: LaneEntry;
  droppedEntries?: readonly LaneEntry[];
  spilledEntry?: LaneEntry;
  reason?: string;
}): EnqueueResult {
  const droppedEntries = Object.freeze([...(input.droppedEntries ?? [])]);

  return Object.freeze({
    status: input.status,
    acceptedEntry: input.acceptedEntry ?? null,
    droppedEntries,
    spilledEntry: input.spilledEntry ?? null,
    reason: input.reason ?? null,
  });
}

export { EnqueueStatus };
export type { EnqueueStatusValue };
