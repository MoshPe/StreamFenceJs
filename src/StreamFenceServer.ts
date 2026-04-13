import { join } from 'node:path';
import { OverflowAction } from './OverflowAction.js';
import type { InboundMessageContext } from './InboundMessageContext.js';
import type { ServerEventListener } from './ServerEventListener.js';
import type { ServerMetrics } from './ServerMetrics.js';
import type { StreamFenceServerSpec } from './StreamFenceServerSpec.js';
import { topicPoliciesFromNamespaceSpec } from './internal/config/TopicPolicy.js';
import { AckTracker } from './internal/delivery/AckTracker.js';
import { ClientSessionRegistry } from './internal/delivery/ClientSessionRegistry.js';
import type { ClientLaneFactory } from './internal/delivery/ClientSessionState.js';
import { ClientLane } from './internal/delivery/ClientLane.js';
import { DiskSpillQueue } from './internal/delivery/DiskSpillQueue.js';
import { RetryService } from './internal/delivery/RetryService.js';
import { TopicDispatcher } from './internal/delivery/TopicDispatcher.js';
import { TopicRegistry } from './internal/delivery/TopicRegistry.js';
import { ManagementHttpServer } from './internal/observability/ManagementHttpServer.js';
import { NamespaceHandler } from './internal/transport/NamespaceHandler.js';
import { SocketServerBootstrap } from './internal/transport/SocketServerBootstrap.js';

export type InboundMessageHandler = (
  payload: unknown,
  context: InboundMessageContext,
) => void | Promise<void>;

export class StreamFenceServer {
  private running = false;
  private readonly handlers = new Map<string, InboundMessageHandler>();
  private readonly listeners: ServerEventListener[];

  private bootstrap: SocketServerBootstrap | undefined;
  private managementServer: ManagementHttpServer | undefined;
  private topicRegistry: TopicRegistry | undefined;
  private sessionRegistry: ClientSessionRegistry | undefined;
  private ackTracker: AckTracker | undefined;
  private retryService: RetryService | undefined;
  private dispatcher: TopicDispatcher | undefined;
  private namespaceHandlers: NamespaceHandler[] = [];

  private retryProcessor: (() => void) | null = null;
  private retryIntervalMs = 50;
  private retryIntervalHandle: NodeJS.Timeout | undefined;
  private startedAtMs = 0;

  constructor(private readonly spec: StreamFenceServerSpec) {
    this.listeners = [...spec.listeners];
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    this.emitServerStarting(this.spec.port, this.spec.managementPort ?? 0);

    this.topicRegistry = new TopicRegistry();
    for (const namespaceSpec of this.spec.namespaces) {
      this.topicRegistry.registerAll(topicPoliciesFromNamespaceSpec(namespaceSpec));
    }

    this.sessionRegistry = new ClientSessionRegistry();
    this.ackTracker = new AckTracker();
    this.retryService = new RetryService(this.ackTracker);
    this.dispatcher = new TopicDispatcher({
      topicRegistry: this.topicRegistry,
      sessionRegistry: this.sessionRegistry,
      ackTracker: this.ackTracker,
      retryService: this.retryService,
      metrics: this.spec.metrics,
    });

    this.bootstrap = new SocketServerBootstrap({
      host: this.spec.host,
      port: this.spec.port,
      engineIoTransportMode: this.spec.engineIoTransportMode,
    });
    await this.bootstrap.start();

    this.namespaceHandlers = this.spec.namespaces.map((namespaceSpec) => {
      const namespaceHandler = new NamespaceHandler({
        namespacePath: namespaceSpec.path,
        ioNamespace: this.bootstrap!.ioServer.of(namespaceSpec.path),
        topicRegistry: this.topicRegistry!,
        sessionRegistry: this.sessionRegistry!,
        dispatcher: this.dispatcher!,
        laneFactory: (clientId, namespace) => this.createLaneFactory(clientId, namespace),
      });
      namespaceHandler.start();
      return namespaceHandler;
    });

    if (this.spec.managementPort !== null) {
      this.managementServer = new ManagementHttpServer({
        host: this.spec.host,
        port: this.spec.managementPort,
        healthProvider: () => ({
          status: this.running ? 'UP' : 'DOWN',
          uptimeMs: this.running ? Date.now() - this.startedAtMs : 0,
        }),
        metricsProvider: () => this.spec.metrics.scrape(),
      });
      await this.managementServer.start();
    }

    if (this.retryProcessor === null) {
      this.retryProcessor = () => {
        this.dispatcher?.processRetries();
      };
    }

    this.running = true;
    this.startedAtMs = Date.now();

    if (this.retryIntervalHandle === undefined) {
      this.retryIntervalHandle = setInterval(() => {
        this.retryProcessor?.();
      }, this.retryIntervalMs);
    }

    this.emitServerStarted(this.port ?? 0, this.managementPort ?? 0);
  }

  async stop(): Promise<void> {
    if (!this.running && this.bootstrap === undefined && this.managementServer === undefined) {
      return;
    }

    this.emitServerStopping(
      this.port ?? this.spec.port,
      this.managementPort ?? (this.spec.managementPort ?? 0),
    );

    if (this.retryIntervalHandle !== undefined) {
      clearInterval(this.retryIntervalHandle);
      this.retryIntervalHandle = undefined;
    }

    for (const namespaceHandler of this.namespaceHandlers) {
      namespaceHandler.stop();
    }
    this.namespaceHandlers = [];

    this.dispatcher?.close();

    if (this.managementServer !== undefined) {
      await this.managementServer.stop();
      this.managementServer = undefined;
    }

    if (this.bootstrap !== undefined) {
      await this.bootstrap.stop();
      this.bootstrap = undefined;
    }

    this.topicRegistry = undefined;
    this.sessionRegistry = undefined;
    this.ackTracker = undefined;
    this.retryService = undefined;
    this.dispatcher = undefined;

    this.running = false;

    this.emitServerStopped(this.spec.port, this.spec.managementPort ?? 0);
  }

  publish(namespace: string, topic: string, payload: unknown): void {
    this.dispatcher?.publish(namespace, topic, payload);
  }

  publishTo(namespace: string, clientId: string, topic: string, payload: unknown): void {
    this.dispatcher?.publishTo(namespace, clientId, topic, payload);
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

  attachRetryProcessor(processor: () => void, intervalMs: number = 50): void {
    this.retryProcessor = processor;
    this.retryIntervalMs = intervalMs;

    if (this.running) {
      if (this.retryIntervalHandle !== undefined) {
        clearInterval(this.retryIntervalHandle);
      }
      this.retryIntervalHandle = setInterval(() => {
        this.retryProcessor?.();
      }, this.retryIntervalMs);
    }
  }

  get port(): number | null {
    return this.bootstrap?.port ?? null;
  }

  get managementPort(): number | null {
    return this.managementServer?.port ?? null;
  }

  private createLaneFactory(clientId: string, namespace: string): ClientLaneFactory {
    return (topic, policy) => {
      const spillQueue =
        policy.overflowAction === OverflowAction.SPILL_TO_DISK
          ? new DiskSpillQueue(this.spillDirectory(namespace, clientId, topic))
          : undefined;

      return new ClientLane(policy, spillQueue);
    };
  }

  private spillDirectory(namespace: string, clientId: string, topic: string): string {
    const namespaceSegments = namespace
      .split('/')
      .filter((segment) => segment.length > 0)
      .map((segment) => this.sanitizePathSegment(segment));

    return join(
      this.spec.spillRootPath,
      ...namespaceSegments,
      this.sanitizePathSegment(clientId),
      this.sanitizePathSegment(topic),
    );
  }

  private sanitizePathSegment(value: string): string {
    return value.replace(/[\\/:"*?<>|]/g, '_');
  }

  private emitServerStarting(port: number, managementPort: number): void {
    for (const listener of this.listeners) {
      listener.onServerStarting?.({
        host: this.spec.host,
        port,
        managementPort,
      });
    }
  }

  private emitServerStarted(port: number, managementPort: number): void {
    for (const listener of this.listeners) {
      listener.onServerStarted?.({
        host: this.spec.host,
        port,
        managementPort,
      });
    }
  }

  private emitServerStopping(port: number, managementPort: number): void {
    for (const listener of this.listeners) {
      listener.onServerStopping?.({
        host: this.spec.host,
        port,
        managementPort,
      });
    }
  }

  private emitServerStopped(port: number, managementPort: number): void {
    for (const listener of this.listeners) {
      listener.onServerStopped?.({
        host: this.spec.host,
        port,
        managementPort,
      });
    }
  }
}
