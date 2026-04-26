import { DeliveryMode } from '../../DeliveryMode.js';
import type { ServerMetrics } from '../../ServerMetrics.js';
import type { TopicPolicy } from '../config/TopicPolicy.js';
import { ServerEventPublisher } from '../observability/ServerEventPublisher.js';
import { createOutboundTopicMessage } from '../protocol/OutboundTopicMessage.js';
import { createTopicMessageMetadata } from '../protocol/TopicMessageMetadata.js';
import type { AckTracker } from './AckTracker.js';
import type { ClientSessionRegistry } from './ClientSessionRegistry.js';
import type { ClientSessionState } from './ClientSessionState.js';
import { LaneEntry } from './LaneEntry.js';
import { createPublishedMessage } from './PublishedMessage.js';
import { RetryAction } from './RetryDecision.js';
import type { RetryService } from './RetryService.js';
import type { TopicRegistry } from './TopicRegistry.js';
import { EnqueueStatus } from './EnqueueResult.js';

export class TopicDispatcher {
  private readonly eventPublisher: ServerEventPublisher;
  private nextSequence = 1;

  constructor(private readonly options: {
    topicRegistry: TopicRegistry;
    sessionRegistry: ClientSessionRegistry;
    ackTracker: AckTracker;
    retryService: RetryService;
    metrics: ServerMetrics;
    eventPublisher?: ServerEventPublisher;
  }) {
    this.eventPublisher = options.eventPublisher ?? ServerEventPublisher.noOp();
  }

  publish(namespace: string, topic: string, payload: unknown): void {
    const policy = this.options.topicRegistry.find(namespace, topic);
    if (policy === undefined) {
      throw new Error(`unknown topic policy for ${namespace}:${topic}`);
    }

    const estimatedBytes = this.estimateBytes(payload);
    const messageId = this.nextMessageId();

    const outbound = createOutboundTopicMessage({
      eventName: topic,
      metadata: createTopicMessageMetadata({
        namespace,
        topic,
        messageId,
        ackRequired: policy.deliveryMode === DeliveryMode.AT_LEAST_ONCE,
      }),
      eventArguments: [payload],
      estimatedBytes,
    });

    const subscribers = this.options.sessionRegistry.subscribersOf(namespace, topic);
    for (const session of subscribers) {
      this.enqueueForSession(session, topic, policy, outbound);
    }

    this.options.metrics.recordPublish(namespace, topic, estimatedBytes);
  }

  publishTo(namespace: string, clientId: string, topic: string, payload: unknown): void {
    const policy = this.options.topicRegistry.find(namespace, topic);
    if (policy === undefined) {
      throw new Error(`unknown topic policy for ${namespace}:${topic}`);
    }

    const session = this.options.sessionRegistry.get(clientId);
    if (session === undefined || session.namespace !== namespace || !session.isSubscribed(topic)) {
      return;
    }

    const estimatedBytes = this.estimateBytes(payload);
    const outbound = createOutboundTopicMessage({
      eventName: topic,
      metadata: createTopicMessageMetadata({
        namespace,
        topic,
        messageId: this.nextMessageId(),
        ackRequired: policy.deliveryMode === DeliveryMode.AT_LEAST_ONCE,
      }),
      eventArguments: [payload],
      estimatedBytes,
    });

    this.enqueueForSession(session, topic, policy, outbound);
    this.options.metrics.recordPublish(namespace, topic, estimatedBytes);
  }

  acknowledge(clientId: string, namespace: string, topic: string, messageId: string): void {
    this.options.ackTracker.acknowledge(clientId, namespace, topic, messageId);

    const session = this.options.sessionRegistry.get(clientId);
    if (session === undefined || session.namespace !== namespace) {
      return;
    }

    const lane = session.lane(topic);
    if (lane === undefined) {
      return;
    }

    const removed = lane.removeByMessageId(messageId);
    if (removed !== undefined && lane.hasPendingSend()) {
      this.scheduleDrain(session, topic);
    }
  }

  processRetries(): void {
    const decisions = this.options.retryService.scan(Date.now());

    for (const decision of decisions) {
      if (decision.action === RetryAction.RETRY) {
        this.options.metrics.recordRetry(decision.namespace, decision.topic);
        this.eventPublisher.retry(
          decision.namespace,
          decision.clientId,
          decision.topic,
          decision.pendingMessage.messageId,
          decision.pendingMessage.retryCount,
        );

        const session = this.options.sessionRegistry.get(decision.clientId);
        if (session === undefined || session.namespace !== decision.namespace) {
          continue;
        }

        const lane = session.lane(decision.topic);
        if (lane === undefined) {
          continue;
        }

        if (lane.findByMessageId(decision.pendingMessage.messageId) === undefined) {
          continue;
        }

        this.scheduleDrain(session, decision.topic);
        continue;
      }

      this.options.metrics.recordRetryExhausted(decision.namespace, decision.topic);
      this.eventPublisher.retryExhausted(
        decision.namespace,
        decision.clientId,
        decision.topic,
        decision.pendingMessage.messageId,
        decision.pendingMessage.retryCount,
      );

      const session = this.options.sessionRegistry.get(decision.clientId);
      if (session === undefined || session.namespace !== decision.namespace) {
        continue;
      }

      const lane = session.lane(decision.topic);
      lane?.removeByMessageId(decision.pendingMessage.messageId);

      // After dropping the exhausted entry, resume draining if spilled messages
      // are waiting and the in-flight budget allows it.
      if (
        lane !== undefined &&
        lane.hasPendingSend() &&
        lane.inFlightCount < lane.topicPolicy.maxInFlight
      ) {
        this.scheduleDrain(session, decision.topic);
      }
    }
  }

  onClientDisconnected(clientId: string): void {
    const session = this.options.sessionRegistry.get(clientId);
    if (session === undefined) {
      return;
    }

    this.options.ackTracker.removeClient(clientId);
    for (const lane of session.allLanes()) {
      lane.clearSpill();
    }
    this.options.sessionRegistry.remove(clientId);
    this.eventPublisher.clientDisconnected(session.namespace, clientId);
  }

  onClientUnsubscribed(clientId: string, namespace: string, topic: string): void {
    const session = this.options.sessionRegistry.get(clientId);
    if (session === undefined || session.namespace !== namespace) {
      return;
    }

    this.options.ackTracker.removeClientTopic(clientId, namespace, topic);
    this.options.sessionRegistry.unsubscribe(session, topic);
    this.eventPublisher.unsubscribed(namespace, clientId, topic);
  }

  close(): void {
  }

  private enqueueForSession(
    session: ClientSessionState,
    topic: string,
    policy: TopicPolicy,
    outboundMessage: ReturnType<typeof createOutboundTopicMessage>,
  ): void {
    const lane = session.lane(topic, policy);
    if (lane === undefined) {
      return;
    }

    const entry = new LaneEntry({
      publishedMessage: createPublishedMessage({
        outboundMessage,
        coalesceKey: policy.coalesce ? topic : null,
      }),
    });

    const enqueueResult = lane.enqueue(entry);

    if (
      enqueueResult.status === EnqueueStatus.REJECTED ||
      enqueueResult.status === EnqueueStatus.SPILLED
    ) {
      this.options.metrics.recordQueueOverflow(session.namespace, topic, enqueueResult.reason);
      this.eventPublisher.queueOverflow(session.namespace, session.clientId, topic, enqueueResult.reason);
    }

    if (enqueueResult.status === EnqueueStatus.REJECTED) {
      this.eventPublisher.publishRejected(session.namespace, session.clientId, topic, enqueueResult.reason);
      return;
    }

    if (enqueueResult.status === EnqueueStatus.COALESCED) {
      this.options.metrics.recordCoalesced(session.namespace, topic);
    }
    if (enqueueResult.status === EnqueueStatus.DROPPED_OLDEST_AND_ACCEPTED) {
      this.options.metrics.recordDropped(session.namespace, topic);
    }
    if (enqueueResult.status === EnqueueStatus.SPILLED) {
      this.options.metrics.recordSpill(session.namespace, topic);
    }

    this.eventPublisher.publishAccepted(
      session.namespace,
      session.clientId,
      topic,
      entry.messageId,
    );
    this.scheduleDrain(session, topic);
  }

  private scheduleDrain(session: ClientSessionState, topic: string): void {
    if (!session.startDrain(topic)) {
      return;
    }

    queueMicrotask(() => {
      void this.drainTopic(session, topic);
    });
  }

  private async drainTopic(session: ClientSessionState, topic: string): Promise<void> {
    const lane = session.lane(topic);
    if (lane === undefined) {
      session.finishDrain(topic);
      return;
    }

    try {
      if (lane.topicPolicy.deliveryMode === DeliveryMode.BEST_EFFORT) {
        await this.drainBestEffort(session, lane);
      } else {
        await this.drainAtLeastOnce(session, topic, lane);
      }
    } finally {
      session.finishDrain(topic);
      const currentLane = session.lane(topic);
      if (
        currentLane !== undefined &&
        currentLane.hasPendingSend() &&
        currentLane.inFlightCount < currentLane.topicPolicy.maxInFlight
      ) {
        this.scheduleDrain(session, topic);
      }
    }
  }

  private async drainBestEffort(
    session: ClientSessionState,
    lane: ReturnType<ClientSessionState['lane']> extends infer T ? Exclude<T, undefined> : never,
  ): Promise<void> {
    for (let entry = await lane.poll(); entry !== undefined; entry = await lane.poll()) {
      try {
        session.client.sendEvent(entry.outboundMessage.eventName, entry.outboundMessage.eventArguments);
      } catch {
        // BEST_EFFORT ignores send failures.
      }
    }
  }

  private async drainAtLeastOnce(
    session: ClientSessionState,
    topic: string,
    lane: ReturnType<ClientSessionState['lane']> extends infer T ? Exclude<T, undefined> : never,
  ): Promise<void> {
    while (lane.inFlightCount < lane.topicPolicy.maxInFlight) {
      const entry = await lane.firstPendingSend();
      if (entry === undefined) {
        return;
      }

      lane.markAwaiting(entry);
      this.options.ackTracker.register(
        session.clientId,
        session.namespace,
        topic,
        entry,
        lane.topicPolicy.ackTimeoutMs,
        lane.topicPolicy.maxRetries,
      );

      try {
        session.client.sendEvent(entry.outboundMessage.eventName, [
          ...entry.outboundMessage.eventArguments,
          entry.outboundMessage.metadata,
        ]);
      } catch {
        this.options.ackTracker.acknowledge(
          session.clientId,
          session.namespace,
          topic,
          entry.messageId,
        );
        lane.removeByMessageId(entry.messageId);
      }
    }
  }

  private nextMessageId(): string {
    const value = this.nextSequence;
    this.nextSequence += 1;
    return `msg-${value}`;
  }

  private estimateBytes(payload: unknown): number {
    try {
      return Buffer.byteLength(JSON.stringify(payload), 'utf8');
    } catch {
      return 1;
    }
  }
}
