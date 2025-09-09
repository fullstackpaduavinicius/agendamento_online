let io = null;

export function setIO(instance) {
  io = instance;
}

export function calendarUpdated(specialistId, dateIso) {
  if (!io) return;
  io.emit('calendar:invalidate', { specialistId, date: dateIso });
  io.to(`spec:${specialistId}`).emit('calendar:update', { specialistId, date: dateIso });
}
