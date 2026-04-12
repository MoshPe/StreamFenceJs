import type { Socket } from 'socket.io';
import type { TransportClient } from './TransportClient.js';

export class ConnectedClientAdapter implements TransportClient {
  constructor(private readonly socket: Socket) {}

  get clientId(): string {
    return this.socket.id;
  }

  sendEvent(eventName: string, args: readonly unknown[]): void {
    this.socket.emit(eventName, ...args);
  }
}
