import { describe, expect, it } from 'vitest';
import { NoopServerMetrics, type ServerMetrics } from '../../src/ServerMetrics.js';

describe('ServerMetrics - interface shape', () => {
  it('NoopServerMetrics implements every recording method and all are no-ops', () => {
    const m: ServerMetrics = new NoopServerMetrics();
    expect(() => m.recordConnect('/feed')).not.toThrow();
    expect(() => m.recordDisconnect('/feed')).not.toThrow();
    expect(() => m.recordPublish('/feed', 'snapshot', 1024)).not.toThrow();
    expect(() => m.recordReceived('/control', 'user-action', 128)).not.toThrow();
    expect(() => m.recordQueueOverflow('/feed', 'snapshot', 'DROP_OLDEST')).not.toThrow();
    expect(() => m.recordRetry('/control', 'alert')).not.toThrow();
    expect(() => m.recordRetryExhausted('/control', 'alert')).not.toThrow();
    expect(() => m.recordDropped('/feed', 'snapshot')).not.toThrow();
    expect(() => m.recordCoalesced('/feed', 'snapshot')).not.toThrow();
    expect(() => m.recordAuthRejected('/control')).not.toThrow();
    expect(() => m.recordAuthRateLimited('/control')).not.toThrow();
  });

});
