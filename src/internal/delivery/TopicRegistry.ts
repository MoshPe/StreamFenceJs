export class TopicRegistry {
  private readonly topicsByClient = new Map<string, Set<string>>();
  private readonly clientsByTopic = new Map<string, Set<string>>();

  subscribe(topic: string, clientId: string): void {
    let subscribers = this.clientsByTopic.get(topic);
    if (subscribers === undefined) {
      subscribers = new Set<string>();
      this.clientsByTopic.set(topic, subscribers);
    }
    subscribers.add(clientId);

    let topics = this.topicsByClient.get(clientId);
    if (topics === undefined) {
      topics = new Set<string>();
      this.topicsByClient.set(clientId, topics);
    }
    topics.add(topic);
  }

  unsubscribe(topic: string, clientId: string): boolean {
    const subscribers = this.clientsByTopic.get(topic);
    if (subscribers === undefined || !subscribers.delete(clientId)) {
      return false;
    }

    if (subscribers.size === 0) {
      this.clientsByTopic.delete(topic);
    }

    const topics = this.topicsByClient.get(clientId);
    if (topics !== undefined) {
      topics.delete(topic);
      if (topics.size === 0) {
        this.topicsByClient.delete(clientId);
      }
    }

    return true;
  }

  unsubscribeAll(clientId: string): void {
    const topics = this.topicsByClient.get(clientId);
    if (topics === undefined) {
      return;
    }

    for (const topic of topics) {
      const subscribers = this.clientsByTopic.get(topic);
      if (subscribers === undefined) {
        continue;
      }

      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.clientsByTopic.delete(topic);
      }
    }

    this.topicsByClient.delete(clientId);
  }

  subscribers(topic: string): string[] {
    return [...(this.clientsByTopic.get(topic) ?? [])];
  }

  topicsFor(clientId: string): string[] {
    return [...(this.topicsByClient.get(clientId) ?? [])];
  }
}
