// src/lib/sockets.js
import { Server } from 'socket.io';
import { setIO } from './socketHub.js';

/**
 * Constrói a lista de origens permitidas para CORS a partir de FRONTEND_URL.
 * Aceita múltiplas URLs separadas por vírgula e remove espaços.
 */
function buildAllowedOrigins() {
  const env = process.env.FRONTEND_URL || '';
  const list = env
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  // Opcional: permitir localhost em dev se nenhuma origin foi definida
  if (list.length === 0) {
    list.push('http://localhost:5173', 'http://127.0.0.1:5173');
  }

  return list;
}

/**
 * Inicializa o Socket.IO no servidor HTTP/HTTPS.
 * @param {import('http').Server | import('https').Server} server
 * @returns {{ io: import('socket.io').Server, notifyCalendar: (specialistId: string|number, dateIso: string) => void }}
 */
export function setupSockets(server) {
  const allowedOrigins = buildAllowedOrigins();

  const io = new Server(server, {
    cors: {
      origin(origin, cb) {
        // Permite requisições sem Origin (ex.: curl, Postman) ou quando em mesma origem
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS bloqueado para origem não permitida: ${origin}`));
      },
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    // Entrar na sala do especialista
    socket.on('join:specialist', (id) => {
      const specialistId = String(id || '').trim();
      if (!specialistId) return;

      socket.join(`spec:${specialistId}`);
      // (Opcional) feedback para o cliente
      socket.emit('join:ok', { room: `spec:${specialistId}` });
    });

    // (Opcional) sair da sala do especialista
    socket.on('leave:specialist', (id) => {
      const specialistId = String(id || '').trim();
      if (!specialistId) return;

      socket.leave(`spec:${specialistId}`);
      socket.emit('leave:ok', { room: `spec:${specialistId}` });
    });
  });

  /**
   * Emite eventos de atualização de calendário:
   * - Para a sala do especialista: `calendar:update`
   * - Broadcast geral para invalidar caches: `calendar:invalidate`
   * @param {string|number} specialistId
   * @param {string} dateIso - Data no formato ISO (ex.: '2025-09-09')
   */
  const notifyCalendar = (specialistId, dateIso) => {
    const id = String(specialistId || '').trim();
    const date = String(dateIso || '').trim();
    if (!id || !date) return;

    io.to(`spec:${id}`).emit('calendar:update', { specialistId: id, date });
    io.emit('calendar:invalidate', { specialistId: id, date });
  };

  // registra globalmente para uso em outras partes da app
  setIO(io);

  return { io, notifyCalendar };
}

export default setupSockets;
