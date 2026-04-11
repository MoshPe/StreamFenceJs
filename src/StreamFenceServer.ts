import type { InboundMessageContext } from './InboundMessageContext.js';
import type { ServerEventListener } from './ServerEventListener.js';
import type { ServerMetrics } from './ServerMetrics.js';
import type { StreamFenceServerSpec } from './StreamFenceServerSpec.js';

export type InboundMessageHandler = (
  payload: unknown,
  context: InboundMessageContext,
) => void | Promise<void>;

export class StreamFenceServer {
  private running = false;
  private readonly handlers = new Map<string, InboundMessageHandler>();
  private readonly listeners: ServerEventListener[];

  constructor(private readonly spec: StreamFenceServerSpec) {
    this.listeners = [...spec.listeners];
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }
    this.running = false;
  }

  publish(namespace: string, topic: string, payload: unknown): void {
    void namespace;
    void topic;
    void payload;
  }

  publishTo(namespace: string, clientId: string, topic: string, payload: unknown): void {
    void namespace;
    void clientId;
    void topic;
    void payload;
  }

  onMessage(namespace: string, topic: string, handler: InboundMessageHandler): void {
    this.handlers.set(`${namespace}::${topic}`, handler);
  }

  addListener(listener: ServerEventListener): void {
    this.listeners.push(listener);
  }

  metrics(): ServerMetrics {
    return this.spec.metrics;
  }
}
