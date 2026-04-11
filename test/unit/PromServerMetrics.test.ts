import { describe, expect, it } from 'vitest';
import { PromServerMetrics } from '../../src/PromServerMetrics.js';

describe('PromServerMetrics', () => {
  it('records all metrics and exposes them via scrape()', () => {
    const metrics = new PromServerMetrics();

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

    const output = metrics.scrape();

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
});
