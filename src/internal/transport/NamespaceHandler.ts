import type { Namespace, Socket } from 'socket.io';
import type { TopicRegistry } from '../delivery/TopicRegistry.js';
import type { ClientSessionRegistry } from '../delivery/ClientSessionRegistry.js';
import { ClientSessionState, type ClientLaneFactory } from '../delivery/ClientSessionState.js';
import type { TopicDispatcher } from '../delivery/TopicDispatcher.js';
import type { AckPayload } from '../protocol/AckPayload.js';
import type { PublishRequest } from '../protocol/PublishRequest.js';
import type { SubscriptionRequest } from '../protocol/SubscriptionRequest.js';
import type { DiskSpillQueueFactory } from '../delivery/DiskSpillQueueFactory.js';
import { ConnectedClientAdapter } from './ConnectedClientAdapter.js';

export class NamespaceHandler {
  private started = false;
  private readonly connectionCleanups = new Map<string, () => void>();
  private readonly onConnectionBound = (socket: Socket) => {
    this.onConnection(socket);
  };

  constructor(private readonly options: {
    namespacePath: string;
    ioNamespace: Namespace;
    topicRegistry: TopicRegistry;
    sessionRegistry: ClientSessionRegistry;
    dispatcher: TopicDispatcher;
    laneFactory?: (clientId: string, namespace: string) => ClientLaneFactory;
    spillQueueFactory?: DiskSpillQueueFactory;
  }) {}

  start(): void {
    if (this.started) {
      return;
    }

    this.options.ioNamespace.on('connection', this.onConnectionBound);
    this.started = true;
  }

  stop(): void {
    if (!this.started) {
      return;
    }

    this.options.ioNamespace.off('connection', this.onConnectionBound);
    for (const cleanup of this.connectionCleanups.values()) {
      cleanup();
    }
    this.connectionCleanups.clear();
    this.started = false;
  }

  private onConnection(socket: Socket): void {
    const session = new ClientSessionState(
      socket.id,
      this.options.namespacePath,
      new ConnectedClientAdapter(socket),
      this.options.laneFactory?.(socket.id, this.options.namespacePath),
      this.options.spillQueueFactory,
    );

    this.options.sessionRegistry.register(session);

    const onSubscribe = (request: SubscriptionRequest): void => {
      const topic = request?.topic;
      if (typeof topic !== 'string' || topic.trim() === '') {
        return;
      }
      if (!this.options.topicRegistry.has(this.options.namespacePath, topic)) {
        return;
      }

      this.options.sessionRegistry.subscribe(session, topic);
    };

    const onUnsubscribe = (request: SubscriptionRequest): void => {
      const topic = request?.topic;
      if (typeof topic !== 'string' || topic.trim() === '') {
        return;
      }

      this.options.dispatcher.onClientUnsubscribed(
        session.clientId,
        this.options.namespacePath,
        topic,
      );
    };

    const onPublish = (request: PublishRequest): void => {
      const topic = request?.topic;
      if (typeof topic !== 'string' || topic.trim() === '') {
        return;
      }
      if (!this.options.topicRegistry.has(this.options.namespacePath, topic)) {
        return;
      }

      this.options.dispatcher.publish(this.options.namespacePath, topic, request.payload);
    };

    const onAck = (ack: AckPayload): void => {
      const topic = ack?.topic;
      const messageId = ack?.messageId;
      if (typeof topic !== 'string' || typeof messageId !== 'string') {
        return;
      }

      this.options.dispatcher.acknowledge(
        session.clientId,
        this.options.namespacePath,
        topic,
        messageId,
      );
    };

    const cleanup = (): void => {
      socket.off('subscribe', onSubscribe);
      socket.off('unsubscribe', onUnsubscribe);
      socket.off('publish', onPublish);
      socket.off('ack', onAck);
      socket.off('disconnect', cleanup);
      this.options.dispatcher.onClientDisconnected(session.clientId);
      this.connectionCleanups.delete(session.clientId);
    };

    socket.on('subscribe', onSubscribe);
    socket.on('unsubscribe', onUnsubscribe);
    socket.on('publish', onPublish);
    socket.on('ack', onAck);
    socket.on('disconnect', cleanup);

    this.connectionCleanups.set(session.clientId, cleanup);
  }
}
