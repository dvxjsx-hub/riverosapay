const { db, save } = require('../config/db');
const { getIO } = require('../realtime/io');
const { newId } = require('../utils/utils');

// Las notificaciones pertenecen a una cuenta, pero pueden estar destinadas
// específicamente al modo EMPLEADO o al modo BOSS.
function modoDestinoPorTipo(tipo) {
  if (tipo === 'jefe_asignado_trabajo' || tipo === 'trabajo_eliminacion_solicitada' || tipo === 'trabajo_solicitud_aceptada' || tipo === 'trabajo_solicitud_rechazada' || tipo === 'trabajo_finalizado_boss') return 'jefe';
  return 'empleado';
}

function modoDestino(n) {
  return n && (n.modoDestino === 'jefe' || n.modoDestino === 'empleado')
    ? n.modoDestino
    : modoDestinoPorTipo(n && n.tipo);
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

function eliminarSolicitudAmistad(usuarioId, solicitudId) {
  const antes = db.notificaciones.length;
  db.notificaciones = db.notificaciones.filter(n => !(
    n.usuarioId === usuarioId &&
    n.tipo === 'amistad_solicitud' &&
    n.solicitudId === solicitudId
  ));
  return antes !== db.notificaciones.length;
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

function marcarLeidas(usuarioId, modo = null) {
  db.notificaciones
    .filter(n => (n.usuarioId === usuarioId || n.empleadoId === usuarioId) && (!modo || modoDestino(n) === modo))
    .forEach(n => { n.leida = true; });
}

module.exports = { crear, crearParaUsuario, listaCompleta, marcarLeidas, modoDestino, eliminarSolicitudAmistad };
