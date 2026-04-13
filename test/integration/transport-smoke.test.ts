import { afterAll, describe, expect, it } from 'vitest';
import { Server } from 'socket.io';
import { io, type Socket } from 'socket.io-client';

const waitFor = (eventName: string, socket: Socket): Promise<void> =>
  new Promise((resolve) => {
    socket.once(eventName, () => resolve());
  });

describe('transport smoke', () => {
  let ioServer: Server | undefined;
  let client: Socket | undefined;

  afterAll(async () => {
    if (client !== undefined && client.connected) {
      await new Promise<void>((resolve) => {
        client!.once('disconnect', () => resolve());
        client!.disconnect();
      });
    }

    await new Promise<void>((resolve) => {
      if (ioServer === undefined) {
        resolve();
        return;
      }

      void ioServer.close(() => resolve());
    });
  });

  it('connects and disconnects a socket.io client', async () => {
    ioServer = new Server(0, {
      transports: ['websocket'],
    });

    const port = (ioServer.httpServer.address() as { port: number }).port;

    client = io(`http://127.0.0.1:${port}`, {
      transports: ['websocket'],
      reconnection: false,
    });

    await waitFor('connect', client);
    expect(client.connected).toBe(true);

    const disconnected = waitFor('disconnect', client);
    client.disconnect();
    await disconnected;
    expect(client.connected).toBe(false);
  });
});
