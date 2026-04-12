import type { NamespaceSpec } from '../../NamespaceSpec.js';
import type { DeliveryModeValue } from '../../DeliveryMode.js';
import type { OverflowActionValue } from '../../OverflowAction.js';

export interface TopicPolicy {
  readonly namespace: string;
  readonly topic: string;
  readonly deliveryMode: DeliveryModeValue;
  readonly overflowAction: OverflowActionValue;
  readonly maxQueuedMessagesPerClient: number;
  readonly maxQueuedBytesPerClient: number;
  readonly ackTimeoutMs: number;
  readonly maxRetries: number;
  readonly coalesce: boolean;
  readonly allowPolling: boolean;
  readonly maxInFlight: number;
}

export function topicPoliciesFromNamespaceSpec(spec: NamespaceSpec): TopicPolicy[] {
  const policies = spec.topics.map((topic) =>
    Object.freeze({
      namespace: spec.path,
      topic,
      deliveryMode: spec.deliveryMode,
      overflowAction: spec.overflowAction,
      maxQueuedMessagesPerClient: spec.maxQueuedMessagesPerClient,
      maxQueuedBytesPerClient: spec.maxQueuedBytesPerClient,
      ackTimeoutMs: spec.ackTimeoutMs,
      maxRetries: spec.maxRetries,
      coalesce: spec.coalesce,
      allowPolling: spec.allowPolling,
      maxInFlight: spec.maxInFlight,
    }),
  );

  return Object.freeze(policies) as TopicPolicy[];
}
