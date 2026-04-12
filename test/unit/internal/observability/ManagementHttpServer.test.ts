import { afterEach, describe, expect, it } from 'vitest';
import { ManagementHttpServer } from '../../../../src/internal/observability/ManagementHttpServer.js';

describe('ManagementHttpServer', () => {
  let server: ManagementHttpServer | undefined;

  afterEach(async () => {
    if (server !== undefined) {
      await server.stop();
    }
  });

  it('serves /health and /metrics from injected providers', async () => {
    server = new ManagementHttpServer({
      host: '127.0.0.1',
      port: 0,
      healthProvider: () => ({ status: 'UP', uptimeMs: 123 }),
      metricsProvider: () => 'streamfence_connections_total 1\n',
    });

    await server.start();

    const healthResponse = await fetch(`http://127.0.0.1:${server.port}/health`);
    expect(healthResponse.status).toBe(200);
    expect(await healthResponse.json()).toEqual({ status: 'UP', uptimeMs: 123 });

    const metricsResponse = await fetch(`http://127.0.0.1:${server.port}/metrics`);
    expect(metricsResponse.status).toBe(200);
    expect(await metricsResponse.text()).toContain('streamfence_connections_total');
  });
});
