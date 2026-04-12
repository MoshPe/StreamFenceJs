/**
 * Mixed-workload client — connects to both the feed and control namespaces.
 *
 * Run (after starting the server):  npx tsx examples/mixed-workload/client.ts
 *
 * Socket.IO protocol used by StreamFenceJs:
 *   Client → server events: subscribe, unsubscribe, publish, ack
 *   Server → client events: topic-message  (envelope: { metadata, payload })
 */
import { io } from 'socket.io-client';

// ── Feed client ───────────────────────────────────────────────────────────────
const feedSocket = io('http://localhost:3000/feed');

feedSocket.on('connect', () => {
  console.log('[feed] connected, id:', feedSocket.id);
  // Subscribe to the snapshot topic
  feedSocket.emit('subscribe', { topic: 'snapshot' });
});

feedSocket.on('topic-message', (envelope: { metadata: { topic: string; messageId: string; ackRequired: boolean }; payload: unknown }) => {
  console.log('[feed] received', envelope.metadata.topic, '->', envelope.payload);
});

feedSocket.on('disconnect', (reason: string) => {
  console.log('[feed] disconnected:', reason);
});

// ── Control client ────────────────────────────────────────────────────────────
const controlSocket = io('http://localhost:3001/commands');

controlSocket.on('connect', () => {
  console.log('[control] connected, id:', controlSocket.id);
  controlSocket.emit('subscribe', { topic: 'send' });
});

controlSocket.on('topic-message', (envelope: { metadata: { topic: string; messageId: string; ackRequired: boolean }; payload: unknown }) => {
  console.log('[control] received', envelope.metadata.topic, '->', envelope.payload);
  // Acknowledge AT_LEAST_ONCE messages
  if (envelope.metadata.ackRequired) {
    controlSocket.emit('ack', { topic: envelope.metadata.topic, messageId: envelope.metadata.messageId });
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  feedSocket.disconnect();
  controlSocket.disconnect();
  process.exit(0);
});
