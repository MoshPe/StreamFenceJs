/**
 * Multi-namespace client — connects to all three namespaces on the same server.
 *
 * Run (after starting the server):  npx tsx examples/multi-namespace/client.ts
 */
import { io } from 'socket.io-client';

const BASE_URL = 'http://localhost:3000';

// ── Prices client — listens to bid and ask topics ────────────────────────────

const pricesSocket = io(`${BASE_URL}/prices`, { transports: ['websocket'] });

pricesSocket.on('connect', () => {
  console.log('[prices] connected');
  pricesSocket.emit('subscribe', { topic: 'bid', token: null });
  pricesSocket.emit('subscribe', { topic: 'ask', token: null });
});

pricesSocket.on('bid', (payload: unknown) => {
  console.log('[prices] bid:', payload);
});

pricesSocket.on('ask', (payload: unknown) => {
  console.log('[prices] ask:', payload);
});

// ── Snapshots client — latest portfolio value only ───────────────────────────

const snapshotsSocket = io(`${BASE_URL}/snapshots`, { transports: ['websocket'] });

snapshotsSocket.on('connect', () => {
  console.log('[snapshots] connected');
  snapshotsSocket.emit('subscribe', { topic: 'portfolio', token: null });
});

snapshotsSocket.on('portfolio', (payload: unknown) => {
  console.log('[snapshots] portfolio:', payload);
});

// ── Alerts client — AT_LEAST_ONCE with acknowledgement ───────────────────────

const alertsSocket = io(`${BASE_URL}/alerts`, { transports: ['websocket'] });

alertsSocket.on('connect', () => {
  console.log('[alerts] connected');
  alertsSocket.emit('subscribe', { topic: 'critical', token: null });
  alertsSocket.emit('subscribe', { topic: 'info', token: null });
});

alertsSocket.on('critical', (payload: unknown, metadata?: { ackRequired?: boolean; topic?: string; messageId?: string }) => {
  console.log('[alerts] CRITICAL:', payload);
  if (metadata?.ackRequired) {
    alertsSocket.emit('ack', { topic: metadata.topic, messageId: metadata.messageId });
    console.log('[alerts] acked message', metadata.messageId);
  }
});

alertsSocket.on('info', (payload: unknown, metadata?: { ackRequired?: boolean; topic?: string; messageId?: string }) => {
  console.log('[alerts] info:', payload);
  if (metadata?.ackRequired) {
    alertsSocket.emit('ack', { topic: metadata.topic, messageId: metadata.messageId });
  }
});

// ── Graceful shutdown ────────────────────────────────────────────────────────

process.on('SIGINT', () => {
  pricesSocket.disconnect();
  snapshotsSocket.disconnect();
  alertsSocket.disconnect();
  console.log('\nDisconnected.');
  process.exit(0);
});
