/**
 * Single-server client — connects to /feed and subscribes to the snapshot topic.
 *
 * Run (after starting the server):  npx tsx examples/single-server/client.ts
 */
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/feed');

socket.on('connect', () => {
  console.log('Connected, id:', socket.id);
  socket.emit('subscribe', { topic: 'snapshot' });
});

socket.on('topic-message', (envelope: { metadata: { topic: string }; payload: unknown }) => {
  console.log('Received', envelope.metadata.topic, '->', envelope.payload);
});

socket.on('disconnect', (reason: string) => {
  console.log('Disconnected:', reason);
});

process.on('SIGINT', () => {
  socket.disconnect();
  process.exit(0);
});
