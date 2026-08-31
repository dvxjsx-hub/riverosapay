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

module.exports = { broadcast, eventosDe, crearEvento };
