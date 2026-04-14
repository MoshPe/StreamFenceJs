/**
 * Single-server client — connects to /feed and subscribes to the snapshot topic.
 *
 * Run (after starting the server):  npx tsx examples/single-server/client.ts
 */
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/feed', { transports: ['websocket'] });

socket.on('connect', () => {
  console.log('Connected, id:', socket.id);
  socket.emit('subscribe', { topic: 'snapshot', token: null });
});

// Messages arrive on an event named after the topic
socket.on('snapshot', (payload: unknown) => {
  console.log('Received snapshot:', payload);
});

socket.on('disconnect', (reason: string) => {
  console.log('Disconnected:', reason);
});

process.on('SIGINT', () => {
  socket.disconnect();
  process.exit(0);
});
