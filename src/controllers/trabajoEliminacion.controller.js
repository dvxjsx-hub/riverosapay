const { save } = require('../config/db');
const trabajo = require('../models/trabajo.model');
const notificaciones = require('../models/notificaciones.model');
const usuarios = require('../models/usuarios.model');
const auditoria = require('../models/auditoria.model');

function usuarioActual(req) {
  return req.userId || (req.session && req.session.userId) || null;
}

function esBossAsignado(turno, actorId) {
  return !!turno && !!actorId && turno.jefeAsignadoId === actorId;
}

async function eliminarTurno(req, res) {
  const turno = trabajo.buscarTurnoPorId(req.params.turnoId);
  if (!turno) return res.status(404).json({ error: 'Trabajo no encontrado.' });

  const actorId = usuarioActual(req);
  if (!actorId) return res.status(401).json({ error: 'Sesión no válida.' });

  const actorRole = String((req.body && req.body.actorRole) || '').toLowerCase();
  const esEmpleado = actorId === turno.empleadoId && actorRole !== 'jefe';
  const esBoss = esBossAsignado(turno, actorId) && actorRole === 'jefe';

  if (!esEmpleado && !esBoss) {
    return res.status(403).json({ error: 'No tienes permiso para eliminar este trabajo.' });
  }

  if (turno.congelado === true) {
    return res.status(409).json({ error: 'Este trabajo está congelado y ya no admite cambios.' });
  }

  // Si el empleado elimina un trabajo no pagado que tiene BOSS asignado,
  // la eliminación queda pendiente de confirmación del BOSS.
  if (esEmpleado && !turno.pagado && turno.jefeAsignadoId) {
    if (turno.eliminacionPendiente === true) {
      return res.status(409).json({ error: 'La solicitud de eliminación ya está pendiente de confirmación.' });
    }

    turno.eliminacionPendiente = true;
    await save();
    trabajo.broadcast(turno.empleadoId);

    const empleado = usuarios.buscarPorId(turno.empleadoId);
    const lugar = trabajo.buscarLugarPorId(turno.lugarId);
    await auditoria.registrar({
      actorId,
      actorType: 'user',
      action: 'solicitar_eliminacion_trabajo',
      resource: 'trabajo',
      resourceId: turno.id
    });
    await notificaciones.crearParaUsuario(turno.jefeAsignadoId, 'trabajo_eliminacion_solicitada', {
      modoDestino: 'jefe',
      empleadoId: turno.empleadoId,
      empleadoUsername: empleado ? empleado.username : '',
      empleadoNombre: empleado ? (empleado.nombreCompleto || empleado.username) : '',
      lugar: lugar ? lugar.nombre : '',
      fechaTrabajo: turno.fecha
    });

    return res.json({ ok: true, pendiente: true, turno });
  }

  const empleadoId = turno.empleadoId;
  const lugar = trabajo.buscarLugarPorId(turno.lugarId);
  const boss = esBoss ? usuarios.buscarPorId(actorId) : null;

  trabajo.eliminarTurno(turno.id);
  await save();
  await auditoria.registrar({
    actorId,
    actorType: 'user',
    action: esBoss ? 'eliminar_trabajo_boss' : 'eliminar_trabajo',
    resource: 'trabajo',
    resourceId: turno.id
  });
  trabajo.broadcast(empleadoId);

  if (esBoss) {
    await notificaciones.crearParaUsuario(empleadoId, 'trabajo_eliminado', {
      modoDestino: 'empleado',
      jefeUsername: boss ? boss.username : (req.body && req.body.actorJefeUsername) || 'Tu BOSS',
      lugar: lugar ? lugar.nombre : ''
    });
  }

  return res.json({ ok: true, pendiente: false });
}

async function confirmarEliminacion(req, res) {
  const turno = trabajo.buscarTurnoPorId(req.params.turnoId);
  if (!turno) return res.status(404).json({ error: 'Trabajo no encontrado.' });

  const actorId = usuarioActual(req);
  if (!actorId || !esBossAsignado(turno, actorId)) {
    return res.status(403).json({ error: 'Solo el BOSS asignado puede confirmar esta eliminación.' });
  }
  if (turno.eliminacionPendiente !== true) {
    return res.status(409).json({ error: 'Este trabajo no tiene una solicitud de eliminación pendiente.' });
  }
  if (turno.congelado === true) {
    return res.status(409).json({ error: 'Este trabajo está congelado y ya no admite cambios.' });
  }

  const empleadoId = turno.empleadoId;
  const lugar = trabajo.buscarLugarPorId(turno.lugarId);
  const boss = usuarios.buscarPorId(actorId);

  trabajo.eliminarTurno(turno.id);
  await save();
  await auditoria.registrar({ actorId, actorType: 'user', action: 'confirmar_eliminacion_trabajo', resource: 'trabajo', resourceId: turno.id });
  trabajo.broadcast(empleadoId);

  await notificaciones.crearParaUsuario(empleadoId, 'trabajo_eliminado', {
    modoDestino: 'empleado',
    jefeUsername: boss ? boss.username : (req.body && req.body.jefeUsername) || 'Tu BOSS',
    lugar: lugar ? lugar.nombre : ''
  });

  return res.json({ ok: true, eliminado: true });
}

async function rechazarEliminacion(req, res) {
  const turno = trabajo.buscarTurnoPorId(req.params.turnoId);
  if (!turno) return res.status(404).json({ error: 'Trabajo no encontrado.' });

  const actorId = usuarioActual(req);
  if (!actorId || !esBossAsignado(turno, actorId)) {
    return res.status(403).json({ error: 'Solo el BOSS asignado puede rechazar esta solicitud.' });
  }
  if (turno.eliminacionPendiente !== true) {
    return res.status(409).json({ error: 'Este trabajo no tiene una solicitud de eliminación pendiente.' });
  }

  turno.eliminacionPendiente = false;
  await save();
  await auditoria.registrar({ actorId, actorType: 'user', action: 'rechazar_eliminacion_trabajo', resource: 'trabajo', resourceId: turno.id });
  trabajo.broadcast(turno.empleadoId);

  const boss = usuarios.buscarPorId(actorId);
  const lugar = trabajo.buscarLugarPorId(turno.lugarId);
  await notificaciones.crearParaUsuario(turno.empleadoId, 'trabajo_eliminacion_rechazada', {
    modoDestino: 'empleado',
    jefeUsername: boss ? boss.username : (req.body && req.body.jefeUsername) || 'Tu BOSS',
    lugar: lugar ? lugar.nombre : ''
  });

  return res.json({ ok: true, pendiente: false });
}

module.exports = { eliminarTurno, confirmarEliminacion, rechazarEliminacion };
