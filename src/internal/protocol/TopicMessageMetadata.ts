/**
 * Internal protocol type - metadata attached to every outbound message.
 *
 * Mirrors `io.streamfence.internal.protocol.TopicMessageMetadata` in the parent Java
 * library. NOT part of the public API.
 *
 * @internal
 */
export interface TopicMessageMetadata {
  readonly namespace: string;
  readonly topic: string;
  readonly messageId: string;
  readonly ackRequired: boolean;
}

/**
 * Creates an immutable metadata record. Frozen so internal callers cannot mutate it.
 *
 * @internal
 */
export function createTopicMessageMetadata(input: {
  namespace: string;
  topic: string;
  messageId: string;
  ackRequired: boolean;
}): TopicMessageMetadata {
  return Object.freeze({
    namespace: input.namespace,
    topic: input.topic,
    messageId: input.messageId,
    ackRequired: input.ackRequired,
  });
}
