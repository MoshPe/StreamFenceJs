import type { ClientSessionState } from './ClientSessionState.js';

export class ClientSessionRegistry {
  private readonly sessions = new Map<string, ClientSessionState>();
  private readonly subscriptions = new Map<string, Set<string>>();

  register(state: ClientSessionState): void {
    this.sessions.set(state.clientId, state);
  }

  remove(clientId: string): void {
    const state = this.sessions.get(clientId);
    if (state !== undefined) {
      for (const topic of state.subscribedTopics()) {
        this.removeSubscription(state.namespace, topic, clientId);
      }
      state.dispose();
    }

    this.sessions.delete(clientId);
  }

  get(clientId: string): ClientSessionState | undefined {
    return this.sessions.get(clientId);
  }

  subscribersOf(namespace: string, topic: string): ClientSessionState[] {
    const clientIds = this.subscriptions.get(this.key(namespace, topic));
    if (clientIds === undefined) {
      return [];
    }

    const subscribers: ClientSessionState[] = [];
    for (const clientId of clientIds) {
      const state = this.sessions.get(clientId);
      if (state !== undefined) {
        subscribers.push(state);
      }
    }

    return subscribers;
  }

  subscribe(state: ClientSessionState, topic: string): void {
    this.sessions.set(state.clientId, state);
    state.subscribe(topic);

    const key = this.key(state.namespace, topic);
    let subscribers = this.subscriptions.get(key);
    if (subscribers === undefined) {
      subscribers = new Set<string>();
      this.subscriptions.set(key, subscribers);
    }

    subscribers.add(state.clientId);
  }

  unsubscribe(state: ClientSessionState, topic: string): void {
    state.unsubscribe(topic);
    this.removeSubscription(state.namespace, topic, state.clientId);
  }

  private removeSubscription(namespace: string, topic: string, clientId: string): void {
    const key = this.key(namespace, topic);
    const subscribers = this.subscriptions.get(key);
    if (subscribers === undefined) {
      return;
    }

    subscribers.delete(clientId);
    if (subscribers.size === 0) {
      this.subscriptions.delete(key);
    }
  }

  private key(namespace: string, topic: string): string {
    return `${namespace}::${topic}`;
  }
}
