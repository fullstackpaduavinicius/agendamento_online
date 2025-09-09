// src/lib/sockets.js
import { Server } from 'socket.io';

export function setupSockets(server) {
  const io = new Server(server, {
    cors: { origin: process.env.FRONTEND_URL, credentials: true }
  });

  io.on('connection', (socket) => {
    socket.on('join:specialist', (id) => socket.join(`spec:${id}`));
  });

  // helper para notificar updates no calendário
  const notifyCalendar = (specialistId, dateIso) => {
    io.to(`spec:${specialistId}`).emit('calendar:update', { specialistId, date: dateIso });
    io.emit('calendar:invalidate', { specialistId, date: dateIso });
  };

  return { io, notifyCalendar };
}
