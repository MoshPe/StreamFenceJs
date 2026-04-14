import { Counter, Registry } from 'prom-client';
import type { ServerMetrics } from './ServerMetrics.js';

export class PromServerMetrics implements ServerMetrics {
  private readonly registry = new Registry();

  private readonly connectionsTotal = new Counter({
    name: 'streamfence_connections_total',
    help: 'Total successful client connections',
    labelNames: ['namespace'],
    registers: [this.registry],
  });

  private readonly disconnectionsTotal = new Counter({
    name: 'streamfence_disconnections_total',
    help: 'Total client disconnections',
    labelNames: ['namespace'],
    registers: [this.registry],
  });

  private readonly publishedTotal = new Counter({
    name: 'streamfence_messages_published_total',
    help: 'Total outbound messages published',
    labelNames: ['namespace', 'topic'],
    registers: [this.registry],
  });

  private readonly publishedBytesTotal = new Counter({
    name: 'streamfence_messages_published_bytes_total',
    help: 'Total outbound message bytes published',
    labelNames: ['namespace', 'topic'],
    registers: [this.registry],
  });

  private readonly receivedTotal = new Counter({
    name: 'streamfence_messages_received_total',
    help: 'Total inbound messages received',
    labelNames: ['namespace', 'topic'],
    registers: [this.registry],
  });

  private readonly receivedBytesTotal = new Counter({
    name: 'streamfence_messages_received_bytes_total',
    help: 'Total inbound message bytes received',
    labelNames: ['namespace', 'topic'],
    registers: [this.registry],
  });

  private readonly queueOverflowTotal = new Counter({
    name: 'streamfence_queue_overflow_total',
    help: 'Total queue overflow events',
    labelNames: ['namespace', 'topic', 'reason'],
    registers: [this.registry],
  });

  private readonly retriesTotal = new Counter({
    name: 'streamfence_retries_total',
    help: 'Total retry attempts',
    labelNames: ['namespace', 'topic'],
    registers: [this.registry],
  });

  private readonly retriesExhaustedTotal = new Counter({
    name: 'streamfence_retries_exhausted_total',
    help: 'Total exhausted retry outcomes',
    labelNames: ['namespace', 'topic'],
    registers: [this.registry],
  });

  private readonly droppedTotal = new Counter({
    name: 'streamfence_messages_dropped_total',
    help: 'Total dropped messages',
    labelNames: ['namespace', 'topic'],
    registers: [this.registry],
  });

  private readonly coalescedTotal = new Counter({
    name: 'streamfence_messages_coalesced_total',
    help: 'Total coalesced messages',
    labelNames: ['namespace', 'topic'],
    registers: [this.registry],
  });

  private readonly spilledTotal = new Counter({
    name: 'streamfence_messages_spilled_total',
    help: 'Total messages spilled to disk',
    labelNames: ['namespace', 'topic'],
    registers: [this.registry],
  });

  private readonly authRejectedTotal = new Counter({
    name: 'streamfence_auth_rejected_total',
    help: 'Total auth rejections',
    labelNames: ['namespace'],
    registers: [this.registry],
  });

  private readonly authRateLimitedTotal = new Counter({
    name: 'streamfence_auth_rate_limited_total',
    help: 'Total auth rate-limited rejections',
    labelNames: ['namespace'],
    registers: [this.registry],
  });

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

  scrape(): string {
    const metrics = this.registry.getMetricsAsArray() as unknown as MetricSnapshot[];
    const lines: string[] = [];

    for (const metric of metrics) {
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);

      for (const sample of Object.values(metric.hashMap)) {
        const labels = this.renderLabels(sample.labels);
        lines.push(`${metric.name}${labels} ${sample.value}`);
      }
    }

    if (lines.length === 0) {
      return '';
    }

    return `${lines.join('\n')}\n`;
  }

  private renderLabels(labels: Record<string, string | number>): string {
    const names = Object.keys(labels);
    if (names.length === 0) {
      return '';
    }

    const fragments = names.map((name) => `${name}="${this.escapeLabel(String(labels[name]))}"`);
    return `{${fragments.join(',')}}`;
  }

  private escapeLabel(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }
}

interface MetricSnapshot {
  name: string;
  help: string;
  type: string;
  hashMap: Record<string, MetricSample>;
}

interface MetricSample {
  value: number;
  labels: Record<string, string | number>;
}
