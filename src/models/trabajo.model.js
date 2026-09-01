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
  const turno = db.turnos.find(t => t.id === id);
  db.turnos = db.turnos.filter(t => t.id !== id);
  // El nombre del lugar no debe quedar flotando cuando ya no existe ningún turno allí.
  if (turno) {
    const quedanTurnos = db.turnos.some(t => t.lugarId === turno.lugarId);
    if (!quedanTurnos) db.lugares = db.lugares.filter(l => l.id !== turno.lugarId);
  }
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