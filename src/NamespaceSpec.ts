import { DeliveryMode, type DeliveryModeValue } from './DeliveryMode.js';
import { InboundAckPolicy, type InboundAckPolicyValue } from './InboundAckPolicy.js';
import { OverflowAction, type OverflowActionValue } from './OverflowAction.js';

/**
 * Immutable specification for a single Socket.IO namespace.
 *
 * A namespace groups one or more topics under a shared delivery policy. Instances are
 * built via `NamespaceSpec.builder(path)` and validated on `build()`.
 *
 * Mirrors `io.streamfence.NamespaceSpec` in the parent Java library.
 */
export interface NamespaceSpec {
  readonly path: string;
  readonly authRequired: boolean;
  readonly topics: readonly string[];
  readonly deliveryMode: DeliveryModeValue;
  readonly overflowAction: OverflowActionValue;
  readonly maxQueuedMessagesPerClient: number;
  readonly maxQueuedBytesPerClient: number;
  readonly ackTimeoutMs: number;
  readonly maxRetries: number;
  readonly coalesce: boolean;
  readonly allowPolling: boolean;
  readonly maxInFlight: number;
  readonly inboundAckPolicy: InboundAckPolicyValue;
}

interface MutableFields {
  path: string;
  authRequired: boolean;
  topics: string[];
  deliveryMode: DeliveryModeValue;
  overflowAction: OverflowActionValue;
  maxQueuedMessagesPerClient: number;
  maxQueuedBytesPerClient: number;
  ackTimeoutMs: number;
  maxRetries: number;
  coalesce: boolean;
  allowPolling: boolean;
  maxInFlight: number;
  inboundAckPolicy: InboundAckPolicyValue;
}

/**
 * Fluent builder for `NamespaceSpec`. Call `NamespaceSpec.builder(path)` to obtain one.
 *
 * Default values (matching Java `NamespaceSpec.Builder`):
 *   deliveryMode               = BEST_EFFORT
 *   overflowAction             = REJECT_NEW
 *   maxQueuedMessagesPerClient = 64
 *   maxQueuedBytesPerClient    = 524_288 (512 KiB)
 *   ackTimeoutMs               = 1_000
 *   maxRetries                 = 0
 *   coalesce                   = false
 *   allowPolling               = true
 *   maxInFlight                = 1
 *   authRequired               = false
 */
export class NamespaceSpecBuilder {
  private readonly fields: MutableFields;

  /** @internal Use `NamespaceSpec.builder(path)` instead. */
  constructor(path: string) {
    this.fields = {
      path,
      authRequired: false,
      topics: [],
      deliveryMode: DeliveryMode.BEST_EFFORT,
      overflowAction: OverflowAction.REJECT_NEW,
      maxQueuedMessagesPerClient: 64,
      maxQueuedBytesPerClient: 524_288,
      ackTimeoutMs: 1_000,
      maxRetries: 0,
      coalesce: false,
      allowPolling: true,
      maxInFlight: 1,
      inboundAckPolicy: InboundAckPolicy.ACK_ON_RECEIPT,
    };
  }

  authRequired(value: boolean): this {
    this.fields.authRequired = value;
    return this;
  }

  topics(topics: readonly string[]): this {
    this.fields.topics = [...topics];
    return this;
  }

  topic(topic: string): this {
    this.fields.topics.push(topic);
    return this;
  }

  deliveryMode(mode: DeliveryModeValue): this {
    this.fields.deliveryMode = mode;
    return this;
  }

  overflowAction(action: OverflowActionValue): this {
    this.fields.overflowAction = action;
    return this;
  }

  maxQueuedMessagesPerClient(value: number): this {
    this.fields.maxQueuedMessagesPerClient = value;
    return this;
  }

  maxQueuedBytesPerClient(value: number): this {
    this.fields.maxQueuedBytesPerClient = value;
    return this;
  }

  ackTimeoutMs(value: number): this {
    this.fields.ackTimeoutMs = value;
    return this;
  }

  maxRetries(value: number): this {
    this.fields.maxRetries = value;
    return this;
  }

  coalesce(value: boolean): this {
    this.fields.coalesce = value;
    return this;
  }

  allowPolling(value: boolean): this {
    this.fields.allowPolling = value;
    return this;
  }

  maxInFlight(value: number): this {
    this.fields.maxInFlight = value;
    return this;
  }

  inboundAckPolicy(value: InboundAckPolicyValue): this {
    this.fields.inboundAckPolicy = value;
    return this;
  }

  build(): NamespaceSpec {
    const topicsCopy = Object.freeze([...this.fields.topics]);
    const normalized = { ...this.fields, topics: topicsCopy };

    if (normalized.maxInFlight <= 0) {
      normalized.maxInFlight = 1;
    }

    validateBasic(normalized);
    validateReliableMode(normalized);

    return Object.freeze({
      path: normalized.path,
      authRequired: normalized.authRequired,
      topics: topicsCopy,
      deliveryMode: normalized.deliveryMode,
      overflowAction: normalized.overflowAction,
      maxQueuedMessagesPerClient: normalized.maxQueuedMessagesPerClient,
      maxQueuedBytesPerClient: normalized.maxQueuedBytesPerClient,
      ackTimeoutMs: normalized.ackTimeoutMs,
      maxRetries: normalized.maxRetries,
      coalesce: normalized.coalesce,
      allowPolling: normalized.allowPolling,
      maxInFlight: normalized.maxInFlight,
      inboundAckPolicy: normalized.inboundAckPolicy,
    });
  }
}

function validateBasic(fields: {
  path: string;
  topics: readonly string[];
  deliveryMode: DeliveryModeValue;
  overflowAction: OverflowActionValue;
  inboundAckPolicy: InboundAckPolicyValue;
  maxQueuedMessagesPerClient: number;
  maxQueuedBytesPerClient: number;
  ackTimeoutMs: number;
  maxRetries: number;
}): void {
  if (!fields.path || fields.path.trim() === '' || !fields.path.startsWith('/')) {
    throw new Error("namespace path must start with '/'");
  }
  if (fields.topics.length === 0) {
    throw new Error('namespace must define at least one topic');
  }

  const seen = new Set<string>();
  for (const topic of fields.topics) {
    if (topic === null || topic === undefined || topic.trim() === '') {
      throw new Error(`topic names must not be blank in namespace ${fields.path}`);
    }
    if (seen.has(topic)) {
      throw new Error(`duplicate topic in namespace ${fields.path}: ${topic}`);
    }
    seen.add(topic);
  }

  if (fields.deliveryMode === null || fields.deliveryMode === undefined) {
    throw new Error('deliveryMode is required');
  }
  if (fields.overflowAction === null || fields.overflowAction === undefined) {
    throw new Error('overflowAction is required');
  }
  if (fields.inboundAckPolicy === null || fields.inboundAckPolicy === undefined) {
    throw new Error('inboundAckPolicy is required');
  }
  if (fields.maxQueuedMessagesPerClient <= 0) {
    throw new Error('maxQueuedMessagesPerClient must be positive');
  }
  if (fields.maxQueuedBytesPerClient <= 0) {
    throw new Error('maxQueuedBytesPerClient must be positive');
  }
  if (fields.ackTimeoutMs <= 0) {
    throw new Error('ackTimeoutMs must be positive');
  }
  if (fields.maxRetries < 0) {
    throw new Error('maxRetries must be zero or positive');
  }
}

function validateReliableMode(fields: {
  deliveryMode: DeliveryModeValue;
  overflowAction: OverflowActionValue;
  coalesce: boolean;
  maxRetries: number;
  maxInFlight: number;
  maxQueuedMessagesPerClient: number;
}): void {
  if (fields.deliveryMode !== DeliveryMode.AT_LEAST_ONCE) {
    return;
  }
  if (
    fields.overflowAction !== OverflowAction.REJECT_NEW &&
    fields.overflowAction !== OverflowAction.SPILL_TO_DISK
  ) {
    throw new Error(
      'AT_LEAST_ONCE namespaces must use REJECT_NEW or SPILL_TO_DISK overflowAction',
    );
  }
  if (fields.coalesce) {
    throw new Error('AT_LEAST_ONCE namespaces cannot enable coalescing');
  }
  if (fields.maxRetries <= 0) {
    throw new Error('AT_LEAST_ONCE namespaces must allow at least one retry');
  }
  if (fields.maxInFlight > fields.maxQueuedMessagesPerClient) {
    throw new Error('maxInFlight must not exceed maxQueuedMessagesPerClient');
  }
}

/**
 * Namespace factory entry point. Use `NamespaceSpec.builder('/path')` to obtain a
 * fresh builder seeded with sensible defaults.
 */
export const NamespaceSpec = Object.freeze({
  /**
   * Returns a new `NamespaceSpecBuilder` for the given namespace path.
   *
   * @param path the namespace path (e.g. `'/feed'`); must start with `'/'`
   */
  builder(path: string): NamespaceSpecBuilder {
    return new NamespaceSpecBuilder(path);
  },
});
