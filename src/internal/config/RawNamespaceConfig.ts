/**
 * Raw (unvalidated) namespace entry as parsed from a YAML/JSON config file.
 *
 * All fields except `path` and `topics` are optional — missing fields are
 * defaulted by `SpecMapper` to match `NamespaceSpec.builder()` defaults.
 *
 * @internal
 */
export interface RawNamespaceConfig {
  path: string;
  topics: string[];
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
