/**
 * Mixed-workload client — connects to both the feed and control namespaces.
 *
 * Run (after starting the server):  npx tsx examples/mixed-workload/client.ts
 *
 * Socket.IO protocol used by StreamFenceJs:
 *   Client → server events: subscribe, unsubscribe, ack
 *   Server → client events: emitted on the topic name (e.g. 'snapshot', 'send')
 */
import { io } from 'socket.io-client';

// ── Feed client ───────────────────────────────────────────────────────────────
const feedSocket = io('http://localhost:3000/feed', { transports: ['websocket'] });

feedSocket.on('connect', () => {
  console.log('[feed] connected, id:', feedSocket.id);
  feedSocket.emit('subscribe', { topic: 'snapshot', token: null });
});

// Messages arrive on an event named after the topic
feedSocket.on('snapshot', (payload: unknown) => {
  console.log('[feed] snapshot:', payload);
});

feedSocket.on('disconnect', (reason: string) => {
  console.log('[feed] disconnected:', reason);
});

// ── Control client ────────────────────────────────────────────────────────────
const controlSocket = io('http://localhost:3001/commands', { transports: ['websocket'] });

controlSocket.on('connect', () => {
  console.log('[control] connected, id:', controlSocket.id);
  controlSocket.emit('subscribe', { topic: 'send', token: null });
});

// AT_LEAST_ONCE messages include metadata as a second argument
controlSocket.on('send', (payload: unknown, metadata?: { topic?: string; messageId?: string; ackRequired?: boolean }) => {
  console.log('[control] send:', payload);
  // Acknowledge AT_LEAST_ONCE messages
  if (metadata?.ackRequired) {
    controlSocket.emit('ack', { topic: metadata.topic, messageId: metadata.messageId });
    console.log('[control] acked message', metadata.messageId);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  feedSocket.disconnect();
  controlSocket.disconnect();
  process.exit(0);
});
