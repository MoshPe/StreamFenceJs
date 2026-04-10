import type { PublishedMessage } from './PublishedMessage.js';

export interface LaneEntry {
  readonly clientId: string;
  readonly message: PublishedMessage;
  readonly enqueuedAtMs: number;
  readonly attempt: number;
  readonly spillFilePath: string | null;
}

export function createLaneEntry(input: {
  clientId: string;
  message: PublishedMessage;
  enqueuedAtMs: number;
  attempt: number;
  spillFilePath?: string;
}): LaneEntry {
  if (input.attempt <= 0) {
    throw new Error('attempt must be positive');
  }

  return Object.freeze({
    clientId: input.clientId,
    message: input.message,
    enqueuedAtMs: input.enqueuedAtMs,
    attempt: input.attempt,
    spillFilePath: input.spillFilePath ?? null,
  });
}
