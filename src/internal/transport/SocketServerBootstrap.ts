import { createServer, type Server as HttpServer } from 'node:http';
import { Server as SocketIoServer } from 'socket.io';
import {
  EngineIoTransportMode,
  type EngineIoTransportModeValue,
} from '../../EngineIoTransportMode.js';

export class SocketServerBootstrap {
  private httpServer: HttpServer | undefined;
  private socketServer: SocketIoServer | undefined;
  private boundPort = 0;

  constructor(private readonly options: {
    host: string;
    port: number;
    engineIoTransportMode: EngineIoTransportModeValue;
  }) {}

  async start(): Promise<void> {
    if (this.httpServer !== undefined) {
      return;
    }

    this.httpServer = createServer();
    this.socketServer = new SocketIoServer(this.httpServer, {
      transports: this.resolveTransports(this.options.engineIoTransportMode),
    });

    await new Promise<void>((resolve, reject) => {
      this.httpServer!.once('error', reject);
      this.httpServer!.listen(this.options.port, this.options.host, () => {
        this.httpServer!.off('error', reject);
        resolve();
      });
    });

    const address = this.httpServer.address();
    if (address === null || typeof address === 'string') {
      throw new Error('failed to determine bound server port');
    }

    this.boundPort = address.port;
  }

  async stop(): Promise<void> {
    if (this.socketServer !== undefined) {
      await new Promise<void>((resolve) => {
        this.socketServer!.close(() => resolve());
      });
      this.socketServer = undefined;
    }

    if (this.httpServer !== undefined) {
      await new Promise<void>((resolve) => {
        this.httpServer!.close(() => resolve());
      });
      this.httpServer = undefined;
      this.boundPort = 0;
    }
  }

  get ioServer(): SocketIoServer {
    if (this.socketServer === undefined) {
      throw new Error('SocketServerBootstrap not started');
    }

    return this.socketServer;
  }

  get port(): number {
    return this.boundPort;
  }

  private resolveTransports(mode: EngineIoTransportModeValue): ('websocket' | 'polling')[] {
    if (mode === EngineIoTransportMode.WEBSOCKET_ONLY) {
      return ['websocket'];
    }

    return ['websocket', 'polling'];
  }
}
