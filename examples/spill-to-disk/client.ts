/**
 * SPILL_TO_DISK client — connects to the /orders namespace and acknowledges
 * each message after a short processing delay, simulating a slow consumer.
 *
 * Run (after starting the server):  npx tsx examples/spill-to-disk/client.ts
 */
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001/orders', {
  transports: ['websocket'],
  reconnection: true,
});

let received = 0;

socket.on('connect', () => {
  console.log(`[client] connected (id: ${socket.id})`);
  socket.emit('subscribe', { topic: 'new', token: null });
  console.log('[client] subscribed to "new" topic');
  console.log('[client] processing messages slowly — spilled messages will replay automatically\n');
});

socket.on(
  'new',
  (
    payload: { orderId: string; amount: string; currency: string; ts: number },
    metadata: { ackRequired: boolean; topic: string; messageId: string },
  ) => {
    received += 1;
    const lag = Date.now() - payload.ts;
    console.log(
      `[client] #${String(received).padStart(2, ' ')} received ${payload.orderId}` +
        ` — $${payload.amount} ${payload.currency}` +
        ` (lag ${lag}ms, msgId: ${metadata.messageId})`,
    );

    if (metadata.ackRequired) {
      // Simulate processing time before acking (triggers disk spill recovery)
      setTimeout(() => {
        socket.emit('ack', { topic: metadata.topic, messageId: metadata.messageId });
        console.log(`[client]    ↳ acked ${metadata.messageId}`);
      }, 300);
    }
  },
);

socket.on('disconnect', (reason) => {
  console.log(`[client] disconnected: ${reason}`);
});

process.on('SIGINT', () => {
  console.log(`\n[client] received ${received} messages total`);
  socket.disconnect();
  process.exit(0);
});
