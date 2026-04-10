import type { TopicMessageMetadata } from './TopicMessageMetadata.js';

/**
 * Internal protocol type - metadata + payload pair for one outbound message.
 *
 * Mirrors `io.streamfence.internal.protocol.TopicMessageEnvelope` in the parent Java
 * library. NOT part of the public API.
 *
 * The payload is typed as `unknown` because the delivery engine may carry either a raw
 * application object (before serialization) or a pre-serialized `Buffer` (after).
 *
 * @internal
 */
export interface TopicMessageEnvelope {
  readonly metadata: TopicMessageMetadata;
  readonly payload: unknown;
}

/**
 * Creates an immutable envelope.
 *
 * @internal
 */
export function createTopicMessageEnvelope(
  metadata: TopicMessageMetadata,
  payload: unknown,
): TopicMessageEnvelope {
  return Object.freeze({ metadata, payload });
}
