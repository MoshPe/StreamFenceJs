import type { TopicPolicy } from '../config/TopicPolicy.js';

export class TopicRegistry {
  private readonly policies = new Map<string, TopicPolicy>();

  register(policy: TopicPolicy): void {
    this.policies.set(this.key(policy.namespace, policy.topic), policy);
  }

  registerAll(policies: TopicPolicy[]): void {
    for (const policy of policies) {
      this.register(policy);
    }
  }

  find(namespace: string, topic: string): TopicPolicy | undefined {
    return this.policies.get(this.key(namespace, topic));
  }

  has(namespace: string, topic: string): boolean {
    return this.policies.has(this.key(namespace, topic));
  }

  private key(namespace: string, topic: string): string {
    return `${namespace}::${topic}`;
  }
}
