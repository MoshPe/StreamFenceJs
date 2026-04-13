import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

export class ManagementHttpServer {
  private server = createServer((request, response) => {
    void this.routeRequest(request, response).catch(() => {
      if (!response.headersSent) {
        response.statusCode = 500;
      }
      if (!response.writableEnded) {
        response.end('internal server error');
      }
    });
  });
  private started = false;
  private boundPort = 0;

  constructor(private readonly options: {
    host: string;
    port: number;
    healthProvider: () => { status: string; uptimeMs: number } | Promise<{ status: string; uptimeMs: number }>;
    metricsProvider: () => string | Promise<string>;
  }) {}

  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(this.options.port, this.options.host, () => {
        this.server.off('error', reject);
        resolve();
      });
    });

    const address = this.server.address() as AddressInfo | null;
    if (address === null) {
      throw new Error('failed to bind management http server');
    }

    this.boundPort = address.port;
    this.started = true;
  }

  async stop(): Promise<void> {
    if (!this.started) {
      return;
    }

    await new Promise<void>((resolve) => {
      this.server.close(() => resolve());
    });

    this.started = false;
    this.boundPort = 0;
  }

  get port(): number {
    return this.boundPort;
  }

  private async routeRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = request.url ?? '';

    if (url === '/health') {
      const payload = await this.options.healthProvider();
      response.statusCode = 200;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(JSON.stringify(payload));
      return;
    }

    if (url === '/metrics') {
      const payload = await this.options.metricsProvider();
      response.statusCode = 200;
      response.setHeader('Content-Type', 'text/plain; charset=utf-8');
      response.end(payload);
      return;
    }

    response.statusCode = 404;
    response.end('not found');
  }
}
