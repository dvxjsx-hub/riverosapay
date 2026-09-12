const { db } = require('../config/db');
const { getIO } = require('../realtime/io');

function broadcast(empleadoId) {
  getIO().to('emp-' + empleadoId).emit('evento:update', eventosDe(empleadoId));
}

function eventosDe(empleadoId) {
  return db.eventos.filter(e => e.empleadoId === empleadoId);
}

function crearEvento(evento) {
  db.eventos.push(evento);
}

function eliminarEvento(id, empleadoId) {
  const index = db.eventos.findIndex(e => e.id === id && e.empleadoId === empleadoId);
  if (index === -1) return null;
  const eliminado = db.eventos.splice(index, 1)[0];
  return eliminado;
}

module.exports = { broadcast, eventosDe, crearEvento, eliminarEvento };
