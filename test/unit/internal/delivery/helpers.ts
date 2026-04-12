import { DeliveryMode, type DeliveryModeValue } from '../../../../src/DeliveryMode.js';
import { OverflowAction, type OverflowActionValue } from '../../../../src/OverflowAction.js';
import type { ServerEventListener } from '../../../../src/ServerEventListener.js';
import type { TopicPolicy } from '../../../../src/internal/config/TopicPolicy.js';
import {
  LaneEntry,
  type LaneEntryInput,
} from '../../../../src/internal/delivery/LaneEntry.js';
import {
  createPublishedMessage,
  type PublishedMessage,
} from '../../../../src/internal/delivery/PublishedMessage.js';
import { createOutboundTopicMessage } from '../../../../src/internal/protocol/OutboundTopicMessage.js';
import { createTopicMessageMetadata } from '../../../../src/internal/protocol/TopicMessageMetadata.js';
import type { TransportClient } from '../../../../src/internal/transport/TransportClient.js';

export function makeTopicPolicy(input?: {
  namespace?: string;
  topic?: string;
  deliveryMode?: DeliveryModeValue;
  overflowAction?: OverflowActionValue;
  maxQueuedMessagesPerClient?: number;
  maxQueuedBytesPerClient?: number;
  ackTimeoutMs?: number;
  maxRetries?: number;
  coalesce?: boolean;
  allowPolling?: boolean;
  maxInFlight?: number;
}): TopicPolicy {
  return Object.freeze({
    namespace: input?.namespace ?? '/feed',
    topic: input?.topic ?? 'snapshot',
    deliveryMode: input?.deliveryMode ?? DeliveryMode.BEST_EFFORT,
    overflowAction: input?.overflowAction ?? OverflowAction.REJECT_NEW,
    maxQueuedMessagesPerClient: input?.maxQueuedMessagesPerClient ?? 3,
    maxQueuedBytesPerClient: input?.maxQueuedBytesPerClient ?? 256,
    ackTimeoutMs: input?.ackTimeoutMs ?? 250,
    maxRetries: input?.maxRetries ?? 2,
    coalesce: input?.coalesce ?? false,
    allowPolling: input?.allowPolling ?? true,
    maxInFlight: input?.maxInFlight ?? 1,
  });
}

export function makePublishedMessage(input?: {
  namespace?: string;
  topic?: string;
  messageId?: string;
  ackRequired?: boolean;
  estimatedBytes?: number;
  payload?: unknown;
  coalesceKey?: string | null;
}): PublishedMessage {
  const namespace = input?.namespace ?? '/feed';
  const topic = input?.topic ?? 'snapshot';

  return createPublishedMessage({
    outboundMessage: createOutboundTopicMessage({
      eventName: topic,
      metadata: createTopicMessageMetadata({
        namespace,
        topic,
        messageId: input?.messageId ?? 'msg-1',
        ackRequired: input?.ackRequired ?? false,
      }),
      eventArguments: [input?.payload ?? { value: 1 }],
      estimatedBytes: input?.estimatedBytes ?? 32,
    }),
    coalesceKey: input?.coalesceKey ?? topic,
  });
}

export function makeLaneEntry(input?: Partial<LaneEntryInput>): LaneEntry {
  const laneEntryInput: LaneEntryInput = {
    publishedMessage: input?.publishedMessage ?? makePublishedMessage(),
  };
  if (input?.retryCount !== undefined) {
    laneEntryInput.retryCount = input.retryCount;
  }
  if (input?.awaiting !== undefined) {
    laneEntryInput.awaiting = input.awaiting;
  }

  return new LaneEntry(laneEntryInput);
}

export interface EmittedEvent {
  readonly eventName: string;
  readonly args: readonly unknown[];
}

export class FakeTransportClient implements TransportClient {
  readonly events: EmittedEvent[] = [];

  constructor(readonly clientId: string = 'client-1') {}

  sendEvent(eventName: string, args: readonly unknown[]): void {
    this.events.push({
      eventName,
      args: [...args],
    });
  }
}

export function makeFakeTransportClient(clientId?: string): FakeTransportClient {
  return new FakeTransportClient(clientId);
}

export function makeFakeListener(): ServerEventListener {
  return {
    onQueueOverflow: () => undefined,
    onRetry: () => undefined,
    onRetryExhausted: () => undefined,
    onPublishAccepted: () => undefined,
    onPublishRejected: () => undefined,
    onClientConnected: () => undefined,
    onClientDisconnected: () => undefined,
    onSubscribed: () => undefined,
    onUnsubscribed: () => undefined,
  };
}
