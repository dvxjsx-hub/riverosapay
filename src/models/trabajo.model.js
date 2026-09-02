const { db } = require('../config/db');
const { getIO } = require('../realtime/io');

function snapshot(empleadoId) {
  const turnos = db.turnos.filter(t => t.empleadoId === empleadoId);
  const idsConTurnos = new Set(turnos.map(t => t.lugarId));
  const lugares = db.lugares.filter(l => l.empleadoId === empleadoId && idsConTurnos.has(l.id));
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

function buscarLugarPorId(id) { return db.lugares.find(l => l.id === id); }
function buscarTurnoPorId(id) { return db.turnos.find(t => t.id === id); }
function crearTurno(turno) { db.turnos.push(turno); }

function marcarFinalizado(id, fecha = new Date().toISOString()) {
  const turno = buscarTurnoPorId(id);
  if (!turno) return null;
  turno.finalizado = true;
  turno.finalizadoAt = fecha;
  return turno;
}

function eliminarTurno(id) {
  const turno = db.turnos.find(t => t.id === id);
  db.turnos = db.turnos.filter(t => t.id !== id);
  if (turno && !db.turnos.some(t => t.lugarId === turno.lugarId)) {
    db.lugares = db.lugares.filter(l => l.id !== turno.lugarId);
  }
}

function misJefes(empleadoId) {
  return db.links.filter(l => l.empleadoId === empleadoId).map(l => ({ jefeId: l.jefeId, jefeUsername: l.jefeUsername }));
}

function tieneTrabajoAsignado(jefeId, empleadoId) {
  return db.turnos.some(t => t.empleadoId === empleadoId && t.jefeAsignadoId === jefeId);
}

function empleadosConTrabajosAsignados(jefeId) {
  const ids = [...new Set(db.turnos.filter(t => t.jefeAsignadoId === jefeId).map(t => t.empleadoId))];
  return ids.map(empleadoId => {
    const user = db.users.find(u => u.id === empleadoId);
    const turnos = db.turnos.filter(t => t.empleadoId === empleadoId && t.jefeAsignadoId === jefeId);
    const idsLugares = new Set(turnos.map(t => t.lugarId));
    const lugares = db.lugares.filter(l => idsLugares.has(l.id));
    return { empleadoId, empleadoUsername: user ? user.username : 'Empleado', empleadoNombre: user ? (user.nombreCompleto || user.username) : 'Empleado', lugares, turnos };
  });
}

module.exports = {
  snapshot, broadcast,
  buscarOCrearLugar, buscarLugarPorId,
  buscarTurnoPorId, crearTurno, marcarFinalizado, eliminarTurno,
  misJefes, tieneTrabajoAsignado, empleadosConTrabajosAsignados
};
