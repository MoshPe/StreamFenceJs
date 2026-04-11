import { describe, expect, it } from 'vitest';
import { LaneEntry } from '../../../../src/internal/delivery/LaneEntry.js';
import { makePublishedMessage } from './helpers.js';

describe('LaneEntry', () => {
  it('exposes computed accessors and mutable retry state', () => {
    const entry = new LaneEntry({
      publishedMessage: makePublishedMessage({
        messageId: 'msg-1',
        topic: 'snapshot',
        estimatedBytes: 77,
        ackRequired: true,
      }),
      retryCount: 1,
      awaiting: true,
    });

    expect(entry.messageId).toBe('msg-1');
    expect(entry.topic).toBe('snapshot');
    expect(entry.estimatedBytes).toBe(77);
    expect(entry.ackRequired).toBe(true);
    expect(entry.retryCount).toBe(1);
    expect(entry.awaiting).toBe(true);

    entry.retryCount += 1;
    entry.awaiting = false;

    expect(entry.retryCount).toBe(2);
    expect(entry.awaiting).toBe(false);
  });
});
