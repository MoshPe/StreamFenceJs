import type { OutboundTopicMessage } from '../protocol/OutboundTopicMessage.js';
import type { PublishedMessage } from './PublishedMessage.js';

export interface LaneEntryInput {
  publishedMessage: PublishedMessage;
  retryCount?: number;
  awaiting?: boolean;
}

export class LaneEntry {
  private readonly publishedMessage: PublishedMessage;
  retryCount: number;
  awaiting: boolean;

  constructor(input: LaneEntryInput) {
    this.publishedMessage = input.publishedMessage;
    this.retryCount = input.retryCount ?? 0;
    this.awaiting = input.awaiting ?? false;
  }

  get outboundMessage(): OutboundTopicMessage {
    return this.publishedMessage.outboundMessage;
  }

  get messageId(): string {
    return this.publishedMessage.outboundMessage.metadata.messageId;
  }

  get topic(): string {
    return this.publishedMessage.outboundMessage.metadata.topic;
  }

  get estimatedBytes(): number {
    return this.publishedMessage.outboundMessage.estimatedBytes;
  }

  get ackRequired(): boolean {
    return this.publishedMessage.outboundMessage.metadata.ackRequired;
  }

  get coalesceKey(): string | null {
    return this.publishedMessage.coalesceKey;
  }
}
