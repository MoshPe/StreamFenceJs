import { describe, expect, it } from 'vitest';
import { InboundAckPolicy, type InboundAckPolicyValue } from '../../src/InboundAckPolicy.js';

describe('InboundAckPolicy', () => {
  it('exposes receipt and handler-success ack policies', () => {
    const onReceipt: InboundAckPolicyValue = InboundAckPolicy.ACK_ON_RECEIPT;
    const onSuccess: InboundAckPolicyValue = InboundAckPolicy.ACK_AFTER_HANDLER_SUCCESS;

    expect(onReceipt).toBe('ACK_ON_RECEIPT');
    expect(onSuccess).toBe('ACK_AFTER_HANDLER_SUCCESS');
    expect(Object.keys(InboundAckPolicy)).toEqual([
      'ACK_ON_RECEIPT',
      'ACK_AFTER_HANDLER_SUCCESS',
    ]);
  });
});
