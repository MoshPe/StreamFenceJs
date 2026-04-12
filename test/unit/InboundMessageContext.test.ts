import { describe, expect, it } from 'vitest';
import {
  createInboundMessageContext,
  type InboundMessageContext,
} from '../../src/InboundMessageContext.js';

describe('InboundMessageContext', () => {
  it('creates an immutable inbound message context record', () => {
    const context: InboundMessageContext = createInboundMessageContext({
      clientId: 'client-1',
      namespace: '/feed',
      topic: 'snapshot',
      messageId: 'msg-1',
      principal: 'alice',
      receivedAtMs: 1700000000000,
    });

    expect(context.clientId).toBe('client-1');
    expect(context.namespace).toBe('/feed');
    expect(context.topic).toBe('snapshot');
    expect(context.messageId).toBe('msg-1');
    expect(context.principal).toBe('alice');
    expect(context.receivedAtMs).toBe(1700000000000);
    expect(Object.isFrozen(context)).toBe(true);
  });
});
