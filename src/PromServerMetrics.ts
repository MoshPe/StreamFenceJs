import { Counter, type Registry, register as defaultRegister } from 'prom-client';
import type { ServerMetrics } from './ServerMetrics.js';

export class PromServerMetrics implements ServerMetrics {
  private readonly registry: Registry;

  private readonly connectionsTotal: Counter;
  private readonly disconnectionsTotal: Counter;
  private readonly publishedTotal: Counter;
  private readonly publishedBytesTotal: Counter;
  private readonly receivedTotal: Counter;
  private readonly receivedBytesTotal: Counter;
  private readonly queueOverflowTotal: Counter;
  private readonly retriesTotal: Counter;
  private readonly retriesExhaustedTotal: Counter;
  private readonly droppedTotal: Counter;
  private readonly coalescedTotal: Counter;
  private readonly spilledTotal: Counter;
  private readonly authRejectedTotal: Counter;
  private readonly authRateLimitedTotal: Counter;

  constructor(registry: Registry = defaultRegister) {
    this.registry = registry;

    this.connectionsTotal = new Counter({
      name: 'streamfence_connections_total',
      help: 'Total successful client connections',
      labelNames: ['namespace'],
      registers: [this.registry],
    });

    this.disconnectionsTotal = new Counter({
      name: 'streamfence_disconnections_total',
      help: 'Total client disconnections',
      labelNames: ['namespace'],
      registers: [this.registry],
    });

    this.publishedTotal = new Counter({
      name: 'streamfence_messages_published_total',
      help: 'Total outbound messages published',
      labelNames: ['namespace', 'topic'],
      registers: [this.registry],
    });

    this.publishedBytesTotal = new Counter({
      name: 'streamfence_messages_published_bytes_total',
      help: 'Total outbound message bytes published',
      labelNames: ['namespace', 'topic'],
      registers: [this.registry],
    });

    this.receivedTotal = new Counter({
      name: 'streamfence_messages_received_total',
      help: 'Total inbound messages received',
      labelNames: ['namespace', 'topic'],
      registers: [this.registry],
    });

    this.receivedBytesTotal = new Counter({
      name: 'streamfence_messages_received_bytes_total',
      help: 'Total inbound message bytes received',
      labelNames: ['namespace', 'topic'],
      registers: [this.registry],
    });

    this.queueOverflowTotal = new Counter({
      name: 'streamfence_queue_overflow_total',
      help: 'Total queue overflow events',
      labelNames: ['namespace', 'topic', 'reason'],
      registers: [this.registry],
    });

    this.retriesTotal = new Counter({
      name: 'streamfence_retries_total',
      help: 'Total retry attempts',
      labelNames: ['namespace', 'topic'],
      registers: [this.registry],
    });

    this.retriesExhaustedTotal = new Counter({
      name: 'streamfence_retries_exhausted_total',
      help: 'Total exhausted retry outcomes',
      labelNames: ['namespace', 'topic'],
      registers: [this.registry],
    });

    this.droppedTotal = new Counter({
      name: 'streamfence_messages_dropped_total',
      help: 'Total dropped messages',
      labelNames: ['namespace', 'topic'],
      registers: [this.registry],
    });

    this.coalescedTotal = new Counter({
      name: 'streamfence_messages_coalesced_total',
      help: 'Total coalesced messages',
      labelNames: ['namespace', 'topic'],
      registers: [this.registry],
    });

    this.spilledTotal = new Counter({
      name: 'streamfence_messages_spilled_total',
      help: 'Total messages spilled to disk',
      labelNames: ['namespace', 'topic'],
      registers: [this.registry],
    });

    this.authRejectedTotal = new Counter({
      name: 'streamfence_auth_rejected_total',
      help: 'Total auth rejections',
      labelNames: ['namespace'],
      registers: [this.registry],
    });

    this.authRateLimitedTotal = new Counter({
      name: 'streamfence_auth_rate_limited_total',
      help: 'Total auth rate-limited rejections',
      labelNames: ['namespace'],
      registers: [this.registry],
    });
  }

  recordConnect(namespace: string): void {
    this.connectionsTotal.labels(namespace).inc();
  }

  recordDisconnect(namespace: string): void {
    this.disconnectionsTotal.labels(namespace).inc();
  }

  recordPublish(namespace: string, topic: string, bytes: number): void {
    this.publishedTotal.labels(namespace, topic).inc();
    this.publishedBytesTotal.labels(namespace, topic).inc(bytes);
  }

  recordReceived(namespace: string, topic: string, bytes: number): void {
    this.receivedTotal.labels(namespace, topic).inc();
    this.receivedBytesTotal.labels(namespace, topic).inc(bytes);
  }

  recordQueueOverflow(namespace: string, topic: string, reason: string): void {
    this.queueOverflowTotal.labels(namespace, topic, reason).inc();
  }

  recordRetry(namespace: string, topic: string): void {
    this.retriesTotal.labels(namespace, topic).inc();
  }

  recordRetryExhausted(namespace: string, topic: string): void {
    this.retriesExhaustedTotal.labels(namespace, topic).inc();
  }

  recordDropped(namespace: string, topic: string): void {
    this.droppedTotal.labels(namespace, topic).inc();
  }

  recordCoalesced(namespace: string, topic: string): void {
    this.coalescedTotal.labels(namespace, topic).inc();
  }

  recordSpill(namespace: string, topic: string): void {
    this.spilledTotal.labels(namespace, topic).inc();
  }

  recordAuthRejected(namespace: string): void {
    this.authRejectedTotal.labels(namespace).inc();
  }

  recordAuthRateLimited(namespace: string): void {
    this.authRateLimitedTotal.labels(namespace).inc();
  }
}
