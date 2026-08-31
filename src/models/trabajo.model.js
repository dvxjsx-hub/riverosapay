const { db } = require('../config/db');
const { getIO } = require('../realtime/io');

function snapshot(empleadoId) {
  const lugares = db.lugares.filter(l => l.empleadoId === empleadoId);
  const turnos = db.turnos.filter(t => t.empleadoId === empleadoId);
  return { lugares, turnos };
}

function broadcast(empleadoId) {
  getIO().to('emp-' + empleadoId).emit('trabajo:update', snapshot(empleadoId));
}

function buscarOCrearLugar(empleadoId, nombreLugar) {
  let lug = db.lugares.find(l => l.empleadoId === empleadoId && l.nombre.toLowerCase() === nombreLugar.toLowerCase());
  if (!lug) {
    lug = { id: require('../utils/utils').newId('lug'), empleadoId, nombre: nombreLugar };
    db.lugares.push(lug);
  }
  return lug;
}

function buscarLugarPorId(id) {
  return db.lugares.find(l => l.id === id);
}

function buscarTurnoPorId(id) {
  return db.turnos.find(t => t.id === id);
}

function crearTurno(turno) {
  db.turnos.push(turno);
}

function eliminarTurno(id) {
  db.turnos = db.turnos.filter(t => t.id !== id);
}

function misJefes(empleadoId) {
  return db.links
    .filter(l => l.empleadoId === empleadoId)
    .map(l => ({ jefeId: l.jefeId, jefeUsername: l.jefeUsername }));
}

module.exports = {
  snapshot, broadcast,
  buscarOCrearLugar, buscarLugarPorId,
  buscarTurnoPorId, crearTurno, eliminarTurno,
  misJefes
};
