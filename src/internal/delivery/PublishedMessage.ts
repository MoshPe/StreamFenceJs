import type { OutboundTopicMessage } from '../protocol/OutboundTopicMessage.js';

export interface PublishedMessage {
  readonly outboundMessage: OutboundTopicMessage;
  readonly coalesceKey: string | null;
}

export function createPublishedMessage(input: {
  outboundMessage: OutboundTopicMessage;
  coalesceKey: string | null;
}): PublishedMessage {
  return Object.freeze({
    outboundMessage: input.outboundMessage,
    coalesceKey: input.coalesceKey,
  });
}
