const trabajo = require('../models/trabajo.model');

function obtenerTurno(req) {
  return trabajo.buscarTurnoPorId(req.params.turnoId);
}

function bloquearCambioJefe(req, res, next) {
  if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'jefeAsignadoId')) {
    return res.status(400).json({ error: 'El jefe asignado queda fijado al crear el trabajo y no puede cambiarse.' });
  }
  next();
}

function bloquearTrabajoCongelado(req, res, next) {
  const turno = obtenerTurno(req);
  if (turno && turno.congelado === true) {
    return res.status(409).json({ error: 'Este trabajo está congelado y ya no admite cambios.' });
  }
  next();
}

function bloquearPagoEmpleadoFinalizado(req, res, next) {
  const turno = obtenerTurno(req);
  if (turno && turno.finalizado === true) {
    return res.status(409).json({ error: 'Este trabajo ya finalizó y el empleado no puede editar el pago.' });
  }
  next();
}

module.exports = { bloquearCambioJefe, bloquearTrabajoCongelado, bloquearPagoEmpleadoFinalizado };
