import {
  createClientSessionState,
  type ClientSessionState,
} from './ClientSessionState.js';
import { TopicRegistry } from './TopicRegistry.js';

export class ClientSessionRegistry {
  private readonly sessions = new Map<string, ClientSessionState>();

  constructor(private readonly namespace: string) {}

  register(session: ClientSessionState, options?: { replace?: boolean }): void {
    if (session.namespace !== this.namespace) {
      throw new Error(
        `session namespace ${session.namespace} does not match registry namespace ${this.namespace}`,
      );
    }

    if (!options?.replace && this.sessions.has(session.clientId)) {
      throw new Error(
        `session already registered for client ${session.clientId} in namespace ${this.namespace}`,
      );
    }

    this.sessions.set(session.clientId, session);
  }

  has(clientId: string): boolean {
    return this.sessions.has(clientId);
  }

  get(clientId: string): ClientSessionState | null {
    return this.sessions.get(clientId) ?? null;
  }

  list(): ClientSessionState[] {
    return [...this.sessions.values()];
  }

  remove(clientId: string): ClientSessionState | null {
    const session = this.sessions.get(clientId) ?? null;
    if (session !== null) {
      this.sessions.delete(clientId);
    }
    return session;
  }

  disconnect(clientId: string, topics: TopicRegistry): ClientSessionState | null {
    const session = this.remove(clientId);
    if (session === null) {
      return null;
    }

    topics.unsubscribeAll(clientId);
    return session;
  }
}

export { createClientSessionState };
export type { ClientSessionState };
