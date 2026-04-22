import { describe, expect, it } from 'vitest';
import { Registry } from 'prom-client';
import { PromServerMetrics } from '../../src/PromServerMetrics.js';

describe('PromServerMetrics', () => {
  it('registers metrics into the provided registry', async () => {
    const registry = new Registry();
    const metrics = new PromServerMetrics(registry);

    metrics.recordConnect('/feed');
    metrics.recordDisconnect('/feed');
    metrics.recordPublish('/feed', 'snapshot', 12);
    metrics.recordReceived('/feed', 'snapshot', 15);
    metrics.recordQueueOverflow('/feed', 'snapshot', 'REJECT_NEW');
    metrics.recordRetry('/feed', 'snapshot');
    metrics.recordRetryExhausted('/feed', 'snapshot');
    metrics.recordDropped('/feed', 'snapshot');
    metrics.recordCoalesced('/feed', 'snapshot');
    metrics.recordAuthRejected('/feed');
    metrics.recordAuthRateLimited('/feed');

    const output = await registry.metrics();

    expect(output).toContain('streamfence_connections_total');
    expect(output).toContain('streamfence_disconnections_total');
    expect(output).toContain('streamfence_messages_published_total');
    expect(output).toContain('streamfence_messages_published_bytes_total');
    expect(output).toContain('streamfence_messages_received_total');
    expect(output).toContain('streamfence_messages_received_bytes_total');
    expect(output).toContain('streamfence_queue_overflow_total');
    expect(output).toContain('streamfence_retries_total');
    expect(output).toContain('streamfence_retries_exhausted_total');
    expect(output).toContain('streamfence_messages_dropped_total');
    expect(output).toContain('streamfence_messages_coalesced_total');
    expect(output).toContain('streamfence_auth_rejected_total');
    expect(output).toContain('streamfence_auth_rate_limited_total');
    expect(output).toContain('namespace="/feed"');
    expect(output).toContain('topic="snapshot"');
  });

  it('uses the default registry when no registry is provided', async () => {
    const { register } = await import('prom-client');
    register.clear();
    const metrics = new PromServerMetrics();
    metrics.recordConnect('/test');
    const output = await register.metrics();
    expect(output).toContain('streamfence_connections_total');
    register.clear();
  });
});
