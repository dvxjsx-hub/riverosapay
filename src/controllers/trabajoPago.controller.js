const { save } = require('../config/db');
const trabajo = require('../models/trabajo.model');
const notificaciones = require('../models/notificaciones.model');
const usuarios = require('../models/usuarios.model');
const auditoria = require('../models/auditoria.model');

function usuarioActual(req) { return req.userId || (req.session && req.session.userId) || null; }

async function actualizarPagoEmpleado(req, res) {
  const turno = trabajo.buscarTurnoPorId(req.params.turnoId);
  if (!turno) return res.status(404).json({ error: 'Trabajo no encontrado.' });

  const actorId = usuarioActual(req);
  if (actorId !== turno.empleadoId) return res.status(403).json({ error: 'Solo el empleado propietario puede registrar su pago.' });

  if (turno.jefeAsignadoId) return res.status(403).json({ error: 'Este trabajo tiene un BOSS asignado. Solo el BOSS puede modificar el pago.' });
  if (turno.finalizado === true) return res.status(409).json({ error: 'Este trabajo ya finalizó y el pago no puede ser editado por el empleado.' });
  if (turno.congelado === true) return res.status(409).json({ error: 'Este trabajo está congelado y ya no admite cambios.' });

  const body = req.body || {};
  if (Object.prototype.hasOwnProperty.call(body, 'jefeAsignadoId')) return res.status(400).json({ error: 'El jefe asignado no puede modificarse después de crear el trabajo.' });
  if (body.valor === undefined && typeof body.pagado !== 'boolean' && body.jefeReferenciaNombre === undefined) return res.status(400).json({ error: 'Indica el valor, el estado de pago o el nombre de referencia que quieres actualizar.' });

  if (body.jefeReferenciaNombre !== undefined) {
    const nombreReferencia = String(body.jefeReferenciaNombre || '').trim();
    if (!nombreReferencia) return res.status(400).json({ error: 'Indica el nombre de referencia del BOSS.' });
    if (nombreReferencia.length > 80) return res.status(400).json({ error: 'El nombre de referencia no puede superar 80 caracteres.' });
    turno.jefeReferenciaNombre = nombreReferencia;
  }

  if (body.valor !== undefined) {
    const valor = body.valor;
    if (valor !== null && (!Number.isFinite(Number(valor)) || Number(valor) < 0)) return res.status(400).json({ error: 'El valor del trabajo no es válido.' });
    turno.valor = valor === null ? null : Number(valor);
  }
  if (typeof body.pagado === 'boolean') turno.pagado = body.pagado;

  await save();
  await auditoria.registrar({ actorId, actorType: 'user', action: 'actualizar_pago_trabajo', resource: 'trabajo', resourceId: turno.id });
  trabajo.broadcast(turno.empleadoId);

  const lug = trabajo.buscarLugarPorId(turno.lugarId);
  if (turno.jefeAsignadoId) {
    const empleado = usuarios.buscarPorId(turno.empleadoId);
    await notificaciones.crearParaUsuario(turno.jefeAsignadoId, 'trabajo_pago_actualizado_empleado', {
      modoDestino: 'jefe',
      empleadoUsername: empleado ? empleado.username : '',
      empleadoNombre: empleado ? (empleado.nombreCompleto || empleado.username) : '',
      lugar: lug ? lug.nombre : '',
      fechaTrabajo: turno.fecha || '',
      valor: turno.valor,
      pagado: turno.pagado
    });
  }

  res.json(turno);
}

module.exports = { actualizarPagoEmpleado };
