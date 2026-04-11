import { OverflowAction } from '../../OverflowAction.js';
import type { TopicPolicy } from '../config/TopicPolicy.js';
import { createEnqueueResult, EnqueueStatus, type EnqueueResult } from './EnqueueResult.js';
import type { LaneEntry } from './LaneEntry.js';

export class ClientLane {
  private readonly queue: LaneEntry[] = [];
  private queuedBytes = 0;

  constructor(private readonly policy: TopicPolicy) {}

  enqueue(entry: LaneEntry): EnqueueResult {
    if (entry.estimatedBytes > this.policy.maxQueuedBytesPerClient) {
      return createEnqueueResult({
        status: EnqueueStatus.REJECTED,
        reason: 'message exceeds maxQueuedBytesPerClient',
      });
    }

    if (this.policy.overflowAction === OverflowAction.SNAPSHOT_ONLY) {
      return this.replaceSnapshot(entry);
    }

    if (this.policy.coalesce || this.policy.overflowAction === OverflowAction.COALESCE) {
      if (this.tryCoalesce(entry)) {
        return createEnqueueResult({
          status: EnqueueStatus.COALESCED,
          reason: 'coalesced by key',
        });
      }
    }

    if (this.fits(entry.estimatedBytes)) {
      this.accept(entry);
      return createEnqueueResult({
        status: EnqueueStatus.ACCEPTED,
        reason: 'accepted',
      });
    }

    switch (this.policy.overflowAction) {
      case OverflowAction.DROP_OLDEST:
        this.dropOldestUntilFits(entry.estimatedBytes);
        if (this.fits(entry.estimatedBytes)) {
          this.accept(entry);
          return createEnqueueResult({
            status: EnqueueStatus.DROPPED_OLDEST_AND_ACCEPTED,
            reason: 'dropped oldest entries to accept new message',
          });
        }
        return createEnqueueResult({
          status: EnqueueStatus.REJECTED,
          reason: 'queue full after drop-oldest attempts',
        });

      case OverflowAction.REJECT_NEW:
        return createEnqueueResult({
          status: EnqueueStatus.REJECTED,
          reason: 'queue full with REJECT_NEW',
        });

      case OverflowAction.COALESCE:
        return createEnqueueResult({
          status: EnqueueStatus.REJECTED,
          reason: 'queue full and no coalesce match',
        });

      case OverflowAction.SPILL_TO_DISK:
        return createEnqueueResult({
          status: EnqueueStatus.REJECTED,
          reason: 'SPILL_TO_DISK is not supported',
        });

      default:
        return createEnqueueResult({
          status: EnqueueStatus.REJECTED,
          reason: 'queue full',
        });
    }
  }

  poll(): LaneEntry | undefined {
    const entry = this.queue.shift();
    if (entry === undefined) {
      return undefined;
    }

    this.queuedBytes -= entry.estimatedBytes;
    if (this.queuedBytes < 0) {
      this.queuedBytes = 0;
    }
    entry.awaiting = false;

    return entry;
  }

  peek(): LaneEntry | undefined {
    return this.queue[0];
  }

  firstPendingSend(): LaneEntry | undefined {
    return this.queue.find((entry) => !entry.awaiting);
  }

  hasPendingSend(): boolean {
    return this.firstPendingSend() !== undefined;
  }

  markAwaiting(entry: LaneEntry): void {
    if (entry.awaiting) {
      return;
    }
    entry.awaiting = true;
  }

  removeByMessageId(id: string): LaneEntry | undefined {
    const index = this.queue.findIndex((entry) => entry.messageId === id);
    if (index < 0) {
      return undefined;
    }

    const [removed] = this.queue.splice(index, 1);
    if (removed === undefined) {
      return undefined;
    }

    this.queuedBytes -= removed.estimatedBytes;
    if (this.queuedBytes < 0) {
      this.queuedBytes = 0;
    }
    removed.awaiting = false;

    return removed;
  }

  findByMessageId(id: string): LaneEntry | undefined {
    return this.queue.find((entry) => entry.messageId === id);
  }

  get topicPolicy(): TopicPolicy {
    return this.policy;
  }

  get inFlightCount(): number {
    return this.queue.reduce((total, entry) => (entry.awaiting ? total + 1 : total), 0);
  }

  private fits(entryBytes: number): boolean {
    if (this.queue.length >= this.policy.maxQueuedMessagesPerClient) {
      return false;
    }

    return this.queuedBytes + entryBytes <= this.policy.maxQueuedBytesPerClient;
  }

  private accept(entry: LaneEntry): void {
    this.queue.push(entry);
    this.queuedBytes += entry.estimatedBytes;
  }

  private replaceSnapshot(entry: LaneEntry): EnqueueResult {
    this.queue.length = 0;
    this.queuedBytes = 0;
    this.accept(entry);

    return createEnqueueResult({
      status: EnqueueStatus.REPLACED_SNAPSHOT,
      reason: 'snapshot replaced',
    });
  }

  private tryCoalesce(entry: LaneEntry): boolean {
    const coalesceKey = entry.coalesceKey;
    if (coalesceKey === null) {
      return false;
    }

    for (let index = this.queue.length - 1; index >= 0; index -= 1) {
      const existing = this.queue[index];
      if (existing === undefined) {
        continue;
      }
      if (existing.awaiting) {
        continue;
      }
      if (existing.coalesceKey !== coalesceKey) {
        continue;
      }

      const nextBytes = this.queuedBytes - existing.estimatedBytes + entry.estimatedBytes;
      if (nextBytes > this.policy.maxQueuedBytesPerClient) {
        return false;
      }

      this.queue[index] = entry;
      this.queuedBytes = nextBytes;
      return true;
    }

    return false;
  }

  private dropOldestUntilFits(entryBytes: number): void {
    while (this.queue.length > 0 && !this.fits(entryBytes)) {
      const removed = this.queue.shift();
      if (removed === undefined) {
        break;
      }

      this.queuedBytes -= removed.estimatedBytes;
      if (this.queuedBytes < 0) {
        this.queuedBytes = 0;
      }
    }
  }
}
