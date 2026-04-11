/**
 * Raw (unparsed/unvalidated) namespace configuration as read from the config file.
 * All fields are optional to accommodate partial overrides or defaults applied later.
 *
 * @internal
 */
export interface RawNamespaceConfig {
  path?: string;
  topics?: string[];
  deliveryMode?: string;
  overflowAction?: string;
  maxQueuedMessagesPerClient?: number;
  maxQueuedBytesPerClient?: number;
  ackTimeoutMs?: number;
  maxRetries?: number;
  coalesce?: boolean;
  allowPolling?: boolean;
  maxInFlight?: number;
  authRequired?: boolean;
}
