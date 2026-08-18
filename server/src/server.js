import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import app from './app.js';
import { connectDB } from './config/db.js';
import { attachSocket } from './services/notificationService.js';
import { trainModel } from './services/attendancePredictionService.js';

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_URL || '*', credentials: true } });

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (token) {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.sub;
    }
    next();
  } catch (_) {
    next(); // allow anonymous sockets too, just without personal rooms
  }
});

io.on('connection', (socket) => {
  if (socket.userId) socket.join(`user:${socket.userId}`);
  socket.on('event:join', (eventId) => socket.join(`event:${eventId}`));
  socket.on('event:leave', (eventId) => socket.leave(`event:${eventId}`));
});

attachSocket(io);

async function start() {
  await connectDB();
  // Train the attendance-prediction Random Forest once at boot on the
  // seeded synthetic dataset, so predictions are available immediately.
  try { trainModel(); } catch (e) { console.error('[ml] initial training failed:', e.message); }

  server.listen(PORT, () => {
    console.log(`\n  SmartEvent Nepal API listening on http://localhost:${PORT}`);
    console.log(`  Health check: http://localhost:${PORT}/api/health\n`);
  });
}

start();

process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));
process.on('uncaughtException', (err) => console.error('[uncaughtException]', err));
