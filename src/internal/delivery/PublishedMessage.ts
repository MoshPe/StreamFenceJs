import type { DeliveryModeValue } from '../../DeliveryMode.js';
import type { TopicMessageMetadata } from '../protocol/TopicMessageMetadata.js';

export interface PublishedMessage {
  readonly metadata: TopicMessageMetadata;
  readonly payloadBytes: Uint8Array;
  readonly byteLength: number;
  readonly deliveryMode: DeliveryModeValue;
  readonly refCount: number;
  readonly disposed: boolean;
  retain(): void;
  release(): void;
}

export const PublishedMessage = Object.freeze({
  create(input: {
    metadata: TopicMessageMetadata;
    payloadBytes: Uint8Array;
    deliveryMode: DeliveryModeValue;
    onDispose?: () => void;
  }): PublishedMessage {
    const storedPayload = new Uint8Array(input.payloadBytes);
    let refCount = 1;
    let disposed = false;

    return Object.freeze({
      metadata: input.metadata,
      get payloadBytes(): Uint8Array {
        return new Uint8Array(storedPayload);
      },
      byteLength: storedPayload.byteLength,
      deliveryMode: input.deliveryMode,
      get refCount(): number {
        return refCount;
      },
      get disposed(): boolean {
        return disposed;
      },
      retain(): void {
        if (disposed) {
          throw new Error('cannot retain a disposed PublishedMessage');
        }
        refCount += 1;
      },
      release(): void {
        if (refCount === 0) {
          throw new Error('PublishedMessage refCount underflow');
        }

        refCount -= 1;

        if (refCount === 0 && !disposed) {
          disposed = true;
          input.onDispose?.();
        }
      },
    });
  },
});
