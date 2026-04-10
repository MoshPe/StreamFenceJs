import type { TopicMessageMetadata } from './TopicMessageMetadata.js';

/**
 * Internal wire type - one outbound message ready to be handed to `socket.emit`.
 *
 * Mirrors `io.streamfence.internal.protocol.OutboundTopicMessage` in the parent Java
 * library. The `eventArguments` array is defensively copied on both creation and
 * read so no caller can mutate another's view.
 *
 * NOT part of the public API.
 *
 * @internal
 */
export interface OutboundTopicMessage {
  readonly eventName: string;
  readonly metadata: TopicMessageMetadata;
  /**
   * The args passed to `socket.emit(eventName, ...args)`. Each access returns a fresh
   * shallow copy of the array - this prevents one lane's mutation from leaking into
   * another lane's view.
   */
  readonly eventArguments: readonly unknown[];
  readonly estimatedBytes: number;
}

/**
 * Creates a new `OutboundTopicMessage`, validating `estimatedBytes > 0` and taking a
 * defensive copy of `eventArguments`.
 *
 * @internal
 */
export function createOutboundTopicMessage(input: {
  eventName: string;
  metadata: TopicMessageMetadata;
  eventArguments: readonly unknown[];
  estimatedBytes: number;
}): OutboundTopicMessage {
  if (input.estimatedBytes <= 0) {
    throw new Error('estimatedBytes must be positive');
  }

  const argsSnapshot: unknown[] = [...input.eventArguments];
  const eventName = input.eventName;
  const metadata = input.metadata;
  const estimatedBytes = input.estimatedBytes;

  return Object.freeze({
    eventName,
    metadata,
    estimatedBytes,
    get eventArguments(): readonly unknown[] {
      return [...argsSnapshot];
    },
  });
}
