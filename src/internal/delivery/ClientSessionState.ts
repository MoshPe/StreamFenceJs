import { OverflowAction } from '../../OverflowAction.js';
import type { TopicPolicy } from '../config/TopicPolicy.js';
import type { TransportClient } from '../transport/TransportClient.js';
import { ClientLane } from './ClientLane.js';
import type { DiskSpillQueueFactory } from './DiskSpillQueueFactory.js';

export type ClientLaneFactory = (topic: string, policy: TopicPolicy) => ClientLane;

export class ClientSessionState {
  private readonly subscriptions = new Set<string>();
  private readonly lanes = new Map<string, ClientLane>();
  private readonly drainingTopics = new Set<string>();

  constructor(
    readonly clientId: string,
    readonly namespace: string,
    readonly client: TransportClient,
    private readonly laneFactory?: ClientLaneFactory,
    private readonly spillQueueFactory?: DiskSpillQueueFactory,
  ) {}

  subscribe(topic: string): void {
    this.subscriptions.add(topic);
  }

  unsubscribe(topic: string): void {
    this.subscriptions.delete(topic);
  }

  isSubscribed(topic: string): boolean {
    return this.subscriptions.has(topic);
  }

  subscribedTopics(): readonly string[] {
    return Object.freeze([...this.subscriptions]);
  }

  lane(topic: string, policy?: TopicPolicy): ClientLane | undefined {
    const existing = this.lanes.get(topic);
    if (existing !== undefined) {
      return existing;
    }

    if (policy === undefined) {
      return undefined;
    }

    const created = this.laneFactory?.(topic, policy) ?? this.createDefaultLane(topic, policy);
    this.lanes.set(topic, created);
    return created;
  }

  startDrain(topic: string): boolean {
    if (this.drainingTopics.has(topic)) {
      return false;
    }

    this.drainingTopics.add(topic);
    return true;
  }

  finishDrain(topic: string): void {
    this.drainingTopics.delete(topic);
  }

  isDraining(topic: string): boolean {
    return this.drainingTopics.has(topic);
  }

  allLanes(): ClientLane[] {
    return [...this.lanes.values()];
  }

  dispose(): void {
    for (const lane of this.lanes.values()) {
      lane.clearSpill();
    }
  }

  private createDefaultLane(topic: string, policy: TopicPolicy): ClientLane {
    const spillQueue =
      policy.overflowAction === OverflowAction.SPILL_TO_DISK && this.spillQueueFactory !== undefined
        ? this.spillQueueFactory.create(this.namespace, this.clientId, topic)
        : undefined;
    return new ClientLane(policy, spillQueue);
  }
}
