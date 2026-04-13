import { LaneEntry } from './LaneEntry.js';
import { createPublishedMessage } from './PublishedMessage.js';
import { createOutboundTopicMessage } from '../protocol/OutboundTopicMessage.js';
import { createTopicMessageMetadata } from '../protocol/TopicMessageMetadata.js';

export interface SpilledEntryData {
  eventName: string;
  metadata: {
    namespace: string;
    topic: string;
    messageId: string;
    ackRequired: boolean;
  };
  eventArguments: unknown[];
  estimatedBytes: number;
  coalesceKey: string | null;
  retryCount: number;
}

export function serialize(entry: LaneEntry): SpilledEntryData {
  const msg = entry.outboundMessage;
  return {
    eventName: msg.eventName,
    metadata: {
      namespace: msg.metadata.namespace,
      topic: msg.metadata.topic,
      messageId: msg.metadata.messageId,
      ackRequired: msg.metadata.ackRequired,
    },
    eventArguments: [...msg.eventArguments],
    estimatedBytes: msg.estimatedBytes,
    coalesceKey: entry.coalesceKey,
    retryCount: entry.retryCount,
  };
}

export function deserialize(data: SpilledEntryData): LaneEntry {
  const metadata = createTopicMessageMetadata({
    namespace: data.metadata.namespace,
    topic: data.metadata.topic,
    messageId: data.metadata.messageId,
    ackRequired: data.metadata.ackRequired,
  });

  const outboundMessage = createOutboundTopicMessage({
    eventName: data.eventName,
    metadata,
    eventArguments: data.eventArguments,
    estimatedBytes: data.estimatedBytes,
  });

  const publishedMessage = createPublishedMessage({
    outboundMessage,
    coalesceKey: data.coalesceKey,
  });

  return new LaneEntry({ publishedMessage, retryCount: data.retryCount });
}
