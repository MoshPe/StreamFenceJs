import { describe, expect, it } from 'vitest';
import { NamespaceSpec } from '../../../../src/NamespaceSpec.js';
import { DeliveryMode } from '../../../../src/DeliveryMode.js';
import { OverflowAction } from '../../../../src/OverflowAction.js';
import { topicPoliciesFromNamespaceSpec } from '../../../../src/internal/config/TopicPolicy.js';

describe('topicPoliciesFromNamespaceSpec', () => {
  it('maps each topic from a namespace spec into a frozen policy', () => {
    const spec = NamespaceSpec.builder('/feed')
      .topics(['snapshot', 'alerts'])
      .deliveryMode(DeliveryMode.BEST_EFFORT)
      .overflowAction(OverflowAction.DROP_OLDEST)
      .maxQueuedMessagesPerClient(10)
      .maxQueuedBytesPerClient(1_024)
      .ackTimeoutMs(500)
      .maxRetries(3)
      .coalesce(true)
      .allowPolling(false)
      .maxInFlight(2)
      .build();

    const policies = topicPoliciesFromNamespaceSpec(spec);

    expect(policies).toHaveLength(2);
    expect(policies[0]?.namespace).toBe('/feed');
    expect(policies[0]?.topic).toBe('snapshot');
    expect(policies[1]?.topic).toBe('alerts');
    expect(policies[0]?.overflowAction).toBe(OverflowAction.DROP_OLDEST);
    expect(Object.isFrozen(policies[0])).toBe(true);
    expect(Object.isFrozen(policies)).toBe(true);
  });
});
