import { afterEach, describe, expect, it } from 'vitest';
import { EngineIoTransportMode } from '../../../../src/EngineIoTransportMode.js';
import { SocketServerBootstrap } from '../../../../src/internal/transport/SocketServerBootstrap.js';

describe('SocketServerBootstrap', () => {
  let bootstrap: SocketServerBootstrap | undefined;

  afterEach(async () => {
    if (bootstrap !== undefined) {
      await bootstrap.stop();
    }
  });

  it('maps WEBSOCKET_ONLY to websocket-only engine transports', async () => {
    bootstrap = new SocketServerBootstrap({
      host: '127.0.0.1',
      port: 0,
      engineIoTransportMode: EngineIoTransportMode.WEBSOCKET_ONLY,
    });

    await bootstrap.start();

    expect(bootstrap.port).toBeGreaterThan(0);
    expect(bootstrap.ioServer.engine.opts.transports).toEqual(['websocket']);
  });

  it('maps WEBSOCKET_OR_POLLING to websocket+polling transports', async () => {
    bootstrap = new SocketServerBootstrap({
      host: '127.0.0.1',
      port: 0,
      engineIoTransportMode: EngineIoTransportMode.WEBSOCKET_OR_POLLING,
    });

    await bootstrap.start();

    expect(bootstrap.ioServer.engine.opts.transports).toEqual(['websocket', 'polling']);
  });
});
