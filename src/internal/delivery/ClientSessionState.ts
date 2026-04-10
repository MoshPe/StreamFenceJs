export interface ClientSessionState {
  readonly namespace: string;
  readonly clientId: string;
  readonly subscriptions: readonly string[];
  readonly lane: unknown;
  readonly principal: string | null;
  readonly connectedAtMs: number;
  readonly metadata: Readonly<Record<string, unknown>> | null;
}

export function createClientSessionState(input: {
  namespace: string;
  clientId: string;
  subscriptions: readonly string[];
  lane: unknown;
  principal: string | null;
  connectedAtMs: number;
  metadata?: Readonly<Record<string, unknown>> | null;
}): ClientSessionState {
  return Object.freeze({
    namespace: input.namespace,
    clientId: input.clientId,
    subscriptions: Object.freeze([...input.subscriptions]),
    lane: input.lane,
    principal: input.principal,
    connectedAtMs: input.connectedAtMs,
    metadata: input.metadata ?? null,
  });
}
