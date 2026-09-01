const { db, save } = require('../config/db');
const { getIO } = require('../realtime/io');
const { newId } = require('../utils/utils');

// Las notificaciones nuevas pertenecen a un usuario, sin depender de su modo.
// modoDestino permite separar visualmente las notificaciones de EMPLEADO y BOSS.
// empleadoId se conserva en notificaciones antiguas por compatibilidad.
function modoDestinoPorTipo(tipo) {
  if (tipo === 'jefe_asignado_trabajo' || tipo === 'trabajo_eliminacion_solicitada') return 'jefe';
  return 'empleado';
}

async function crearParaUsuario(usuarioId, tipo, extra = {}) {
  const notif = {
    id: newId('not'),
    usuarioId,
    tipo,
    fecha: Date.now(),
    leida: false,
    modoDestino: extra.modoDestino || modoDestinoPorTipo(tipo),
    ...extra
  };
  db.notificaciones.push(notif);
  await save();
  getIO().to('emp-' + usuarioId).emit('notificaciones:update');
  getIO().to('jefe-' + usuarioId).emit('notificaciones:update');
  return notif;
}

async function crear(empleadoId, tipo, extra) {
  return crearParaUsuario(empleadoId, tipo, { empleadoId, ...extra });
}

function listaCompleta(usuarioId) {
  const joinRequestsModel = require('./verificacion.model');
  const solicitudes = joinRequestsModel.solicitudesNoAceptadas(usuarioId)
    .map(r => ({
      id: r.id,
      tipo: 'solicitud',
      estado: r.estado,
      jefeUsername: r.jefeUsername,
      fecha: r.fecha,
      leida: true,
      modoDestino: 'empleado'
    }));
  const infos = db.notificaciones.filter(n => n.usuarioId === usuarioId || n.empleadoId === usuarioId);
  return [...solicitudes, ...infos].sort((a, b) => b.fecha - a.fecha);
}

function marcarLeidas(usuarioId) {
  db.notificaciones.filter(n => n.usuarioId === usuarioId || n.empleadoId === usuarioId).forEach(n => { n.leida = true; });
}

module.exports = { crear, crearParaUsuario, listaCompleta, marcarLeidas };