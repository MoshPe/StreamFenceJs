import {
  createRetryDecision,
  RetryAction,
  type RetryDecision,
} from './RetryDecision.js';
import type { LaneEntry } from './LaneEntry.js';

interface PendingAckState {
  key: string;
  clientId: string;
  namespace: string;
  topic: string;
  entry: LaneEntry;
  ackTimeoutMs: number;
  maxRetries: number;
  generation: number;
  deadline: number;
}

interface ExpirationHandle {
  key: string;
  deadline: number;
  generation: number;
}

export class AckTracker {
  private readonly pending = new Map<string, PendingAckState>();
  private readonly heap: ExpirationHandle[] = [];

  register(
    clientId: string,
    namespace: string,
    topic: string,
    entry: LaneEntry,
    ackTimeoutMs: number,
    maxRetries: number,
    now: number = Date.now(),
  ): void {
    const key = this.keyFor(clientId, namespace, topic, entry.messageId);
    const previous = this.pending.get(key);
    const generation = (previous?.generation ?? 0) + 1;
    const deadline = now + ackTimeoutMs;

    const state: PendingAckState = {
      key,
      clientId,
      namespace,
      topic,
      entry,
      ackTimeoutMs,
      maxRetries,
      generation,
      deadline,
    };

    this.pending.set(key, state);
    this.heapPush({ key, deadline, generation });
  }

  acknowledge(clientId: string, namespace: string, topic: string, messageId: string): boolean {
    return this.pending.delete(this.keyFor(clientId, namespace, topic, messageId));
  }

  collectExpired(now: number = Date.now()): RetryDecision[] {
    const decisions: RetryDecision[] = [];

    while (true) {
      const head = this.heapPeek();
      if (head === undefined || head.deadline > now) {
        break;
      }

      const handle = this.heapPop();
      if (handle === undefined) {
        break;
      }

      const state = this.pending.get(handle.key);
      if (state === undefined) {
        continue;
      }
      if (state.generation !== handle.generation) {
        continue;
      }

      if (state.entry.retryCount < state.maxRetries) {
        state.entry.retryCount += 1;
        state.entry.awaiting = false;

        state.generation += 1;
        state.deadline = now + state.ackTimeoutMs;
        this.heapPush({
          key: state.key,
          deadline: state.deadline,
          generation: state.generation,
        });

        decisions.push(
          createRetryDecision({
            action: RetryAction.RETRY,
            clientId: state.clientId,
            namespace: state.namespace,
            topic: state.topic,
            pendingMessage: state.entry,
          }),
        );
        continue;
      }

      state.entry.awaiting = false;
      this.pending.delete(state.key);
      decisions.push(
        createRetryDecision({
          action: RetryAction.EXHAUSTED,
          clientId: state.clientId,
          namespace: state.namespace,
          topic: state.topic,
          pendingMessage: state.entry,
        }),
      );
    }

    return decisions;
  }

  removeClient(clientId: string): void {
    const keysToDelete: string[] = [];
    for (const [key, state] of this.pending.entries()) {
      if (state.clientId === clientId) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.pending.delete(key);
    }
  }

  removeClientTopic(clientId: string, namespace: string, topic: string): void {
    const keysToDelete: string[] = [];
    for (const [key, state] of this.pending.entries()) {
      if (
        state.clientId === clientId &&
        state.namespace === namespace &&
        state.topic === topic
      ) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.pending.delete(key);
    }
  }

  get pendingCount(): number {
    return this.pending.size;
  }

  private keyFor(clientId: string, namespace: string, topic: string, messageId: string): string {
    return `${clientId}::${namespace}::${topic}::${messageId}`;
  }

  private heapPeek(): ExpirationHandle | undefined {
    return this.heap[0];
  }

  private heapPush(handle: ExpirationHandle): void {
    this.heap.push(handle);
    this.heapBubbleUp(this.heap.length - 1);
  }

  private heapPop(): ExpirationHandle | undefined {
    const first = this.heap[0];
    const last = this.heap.pop();

    if (first === undefined) {
      return undefined;
    }
    if (last === undefined) {
      return first;
    }
    if (this.heap.length === 0) {
      return first;
    }

    this.heap[0] = last;
    this.heapBubbleDown(0);
    return first;
  }

  private heapBubbleUp(startIndex: number): void {
    let index = startIndex;

    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const current = this.heap[index];
      const parent = this.heap[parentIndex];
      if (current === undefined || parent === undefined) {
        return;
      }
      if (parent.deadline <= current.deadline) {
        return;
      }

      this.heap[index] = parent;
      this.heap[parentIndex] = current;
      index = parentIndex;
    }
  }

  private heapBubbleDown(startIndex: number): void {
    let index = startIndex;

    while (true) {
      const leftIndex = index * 2 + 1;
      const rightIndex = leftIndex + 1;
      let smallestIndex = index;

      if (this.deadlineAt(leftIndex) < this.deadlineAt(smallestIndex)) {
        smallestIndex = leftIndex;
      }
      if (this.deadlineAt(rightIndex) < this.deadlineAt(smallestIndex)) {
        smallestIndex = rightIndex;
      }

      if (smallestIndex === index) {
        return;
      }

      const current = this.heap[index];
      const smallest = this.heap[smallestIndex];
      if (current === undefined || smallest === undefined) {
        return;
      }

      this.heap[index] = smallest;
      this.heap[smallestIndex] = current;
      index = smallestIndex;
    }
  }

  private deadlineAt(index: number): number {
    const handle = this.heap[index];
    if (handle === undefined) {
      return Number.POSITIVE_INFINITY;
    }
    return handle.deadline;
  }
}
