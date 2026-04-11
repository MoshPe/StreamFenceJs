import type { LaneEntry } from './LaneEntry.js';
import { RetryAction, type RetryActionValue } from './RetryAction.js';

export interface RetryDecision {
  readonly action: RetryActionValue;
  readonly clientId: string;
  readonly namespace: string;
  readonly topic: string;
  readonly pendingMessage: LaneEntry;
}

export function createRetryDecision(input: {
  action: RetryActionValue;
  clientId: string;
  namespace: string;
  topic: string;
  pendingMessage: LaneEntry;
}): RetryDecision {
  return Object.freeze({
    action: input.action,
    clientId: input.clientId,
    namespace: input.namespace,
    topic: input.topic,
    pendingMessage: input.pendingMessage,
  });
}

export { RetryAction };
export type { RetryActionValue };
