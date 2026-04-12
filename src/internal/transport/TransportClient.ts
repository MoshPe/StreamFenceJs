export interface TransportClient {
  readonly clientId: string;
  sendEvent(eventName: string, args: readonly unknown[]): void;
}
