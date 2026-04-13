import { describe, expect, it, vi } from 'vitest';
import { TopicRegistry } from '../../../../src/internal/delivery/TopicRegistry.js';
import { ClientSessionRegistry } from '../../../../src/internal/delivery/ClientSessionRegistry.js';
import { NamespaceHandler } from '../../../../src/internal/transport/NamespaceHandler.js';
import { makeTopicPolicy } from '../delivery/helpers.js';

type EventHandler = (...args: unknown[]) => void;

class FakeSocket {
  private readonly listeners = new Map<string, Set<EventHandler>>();

  constructor(readonly id: string) {}

  on = vi.fn((event: string, handler: EventHandler) => {
    let handlers = this.listeners.get(event);
    if (handlers === undefined) {
      handlers = new Set<EventHandler>();
      this.listeners.set(event, handlers);
    }
    handlers.add(handler);
    return this;
  });

  off = vi.fn((event: string, handler: EventHandler) => {
    const handlers = this.listeners.get(event);
    handlers?.delete(handler);
    if (handlers?.size === 0) {
      this.listeners.delete(event);
    }
    return this;
  });

  emit(event: string, ...args: unknown[]): boolean {
    for (const handler of [...(this.listeners.get(event) ?? [])]) {
      handler(...args);
    }
    return true;
  }

  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

class FakeNamespace {
  private readonly listeners = new Map<string, Set<EventHandler>>();

  on = vi.fn((event: string, handler: EventHandler) => {
    let handlers = this.listeners.get(event);
    if (handlers === undefined) {
      handlers = new Set<EventHandler>();
      this.listeners.set(event, handlers);
    }
    handlers.add(handler);
    return this;
  });

  off = vi.fn((event: string, handler: EventHandler) => {
    const handlers = this.listeners.get(event);
    handlers?.delete(handler);
    if (handlers?.size === 0) {
      this.listeners.delete(event);
    }
    return this;
  });

  connect(socket: FakeSocket): void {
    for (const handler of this.listeners.get('connection') ?? []) {
      handler(socket);
    }
  }
}

describe('NamespaceHandler', () => {
  it('ignores invalid payloads and forwards valid subscribe, publish, unsubscribe, and ack events', () => {
    const topicRegistry = new TopicRegistry();
    topicRegistry.register(makeTopicPolicy({ topic: 'snapshot' }));

    const sessionRegistry = new ClientSessionRegistry();
    const dispatcher = {
      publish: vi.fn(),
      acknowledge: vi.fn(),
      onClientUnsubscribed: vi.fn(),
      onClientDisconnected: vi.fn(),
    };
    const ioNamespace = new FakeNamespace();
    const handler = new NamespaceHandler({
      namespacePath: '/feed',
      ioNamespace: ioNamespace as never,
      topicRegistry,
      sessionRegistry,
      dispatcher: dispatcher as never,
    });
    const socket = new FakeSocket('client-1');

    handler.start();
    ioNamespace.connect(socket);

    const session = sessionRegistry.get('client-1');
    expect(session).toBeDefined();
    expect(session?.isSubscribed('snapshot')).toBe(false);

    socket.emit('subscribe', null);
    socket.emit('subscribe', { topic: '   ' });
    socket.emit('subscribe', { topic: 'unknown' });
    expect(session?.isSubscribed('snapshot')).toBe(false);

    socket.emit('subscribe', { topic: 'snapshot' });
    expect(session?.isSubscribed('snapshot')).toBe(true);

    socket.emit('publish', null);
    socket.emit('publish', { topic: '   ' });
    socket.emit('publish', { topic: 'unknown', payload: { value: 1 } });
    socket.emit('publish', { topic: 'snapshot', payload: { value: 2 } });
    expect(dispatcher.publish).toHaveBeenCalledTimes(1);
    expect(dispatcher.publish).toHaveBeenCalledWith('/feed', 'snapshot', { value: 2 });

    socket.emit('ack', null);
    socket.emit('ack', { topic: 'snapshot', messageId: 123 });
    socket.emit('ack', { topic: 'snapshot', messageId: 'msg-1' });
    expect(dispatcher.acknowledge).toHaveBeenCalledTimes(1);
    expect(dispatcher.acknowledge).toHaveBeenCalledWith(
      'client-1',
      '/feed',
      'snapshot',
      'msg-1',
    );

    socket.emit('unsubscribe', null);
    socket.emit('unsubscribe', { topic: '  ' });
    socket.emit('unsubscribe', { topic: 'snapshot' });
    expect(dispatcher.onClientUnsubscribed).toHaveBeenCalledTimes(1);
    expect(dispatcher.onClientUnsubscribed).toHaveBeenCalledWith(
      'client-1',
      '/feed',
      'snapshot',
    );
  });

  it('cleans up socket listeners on disconnect and stop, and start/stop are idempotent', () => {
    const topicRegistry = new TopicRegistry();
    topicRegistry.register(makeTopicPolicy({ topic: 'snapshot' }));

    const sessionRegistry = new ClientSessionRegistry();
    const dispatcher = {
      publish: vi.fn(),
      acknowledge: vi.fn(),
      onClientUnsubscribed: vi.fn(),
      onClientDisconnected: vi.fn((clientId: string) => {
        sessionRegistry.remove(clientId);
      }),
    };
    const ioNamespace = new FakeNamespace();
    const handler = new NamespaceHandler({
      namespacePath: '/feed',
      ioNamespace: ioNamespace as never,
      topicRegistry,
      sessionRegistry,
      dispatcher: dispatcher as never,
    });

    handler.start();
    handler.start();

    const firstSocket = new FakeSocket('client-1');
    const secondSocket = new FakeSocket('client-2');
    ioNamespace.connect(firstSocket);
    ioNamespace.connect(secondSocket);

    expect(ioNamespace.on).toHaveBeenCalledTimes(1);
    expect(firstSocket.listenerCount('disconnect')).toBe(1);
    expect(secondSocket.listenerCount('disconnect')).toBe(1);

    firstSocket.emit('disconnect');
    expect(dispatcher.onClientDisconnected).toHaveBeenCalledTimes(1);
    expect(firstSocket.listenerCount('subscribe')).toBe(0);
    expect(firstSocket.listenerCount('unsubscribe')).toBe(0);
    expect(firstSocket.listenerCount('publish')).toBe(0);
    expect(firstSocket.listenerCount('ack')).toBe(0);
    expect(firstSocket.listenerCount('disconnect')).toBe(0);

    handler.stop();
    handler.stop();

    expect(dispatcher.onClientDisconnected).toHaveBeenCalledTimes(2);
    expect(ioNamespace.off).toHaveBeenCalledTimes(1);
    expect(secondSocket.listenerCount('subscribe')).toBe(0);
    expect(secondSocket.listenerCount('unsubscribe')).toBe(0);
    expect(secondSocket.listenerCount('publish')).toBe(0);
    expect(secondSocket.listenerCount('ack')).toBe(0);
    expect(secondSocket.listenerCount('disconnect')).toBe(0);
  });
});
