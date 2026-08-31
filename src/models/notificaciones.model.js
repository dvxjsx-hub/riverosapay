const { db } = require('../config/db');
const { save } = require('../config/db');
const { getIO } = require('../realtime/io');
const { newId } = require('../utils/utils');

// crea una notificación de info (no confundir con las solicitudes de verificación)
async function crear(empleadoId, tipo, extra) {
  const notif = { id: newId('not'), empleadoId, tipo, fecha: Date.now(), leida: false, ...extra };
  db.notificaciones.push(notif);
  await save();
  getIO().to('emp-' + empleadoId).emit('notificaciones:update');
  return notif;
}

function listaCompleta(empleadoId) {
  const joinRequestsModel = require('./verificacion.model');
  const solicitudes = joinRequestsModel.solicitudesNoAceptadas(empleadoId)
    .map(r => ({ id: r.id, tipo: 'solicitud', estado: r.estado, jefeUsername: r.jefeUsername, fecha: r.fecha, leida: true }));
  const infos = db.notificaciones.filter(n => n.empleadoId === empleadoId);
  return [...solicitudes, ...infos].sort((a, b) => b.fecha - a.fecha);
}

function marcarLeidas(empleadoId) {
  db.notificaciones.filter(n => n.empleadoId === empleadoId).forEach(n => { n.leida = true; });
}

module.exports = { crear, listaCompleta, marcarLeidas };
