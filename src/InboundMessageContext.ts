/**
 * Context passed to inbound topic handlers.
 */
export interface InboundMessageContext {
  readonly clientId: string;
  readonly namespace: string;
  readonly topic: string;
  readonly messageId: string;
  readonly principal: string | null;
  readonly receivedAtMs: number;
}

export function createInboundMessageContext(input: {
  clientId: string;
  namespace: string;
  topic: string;
  messageId: string;
  principal: string | null;
  receivedAtMs: number;
}): InboundMessageContext {
  return Object.freeze({
    clientId: input.clientId,
    namespace: input.namespace,
    topic: input.topic,
    messageId: input.messageId,
    principal: input.principal,
    receivedAtMs: input.receivedAtMs,
  });
}
