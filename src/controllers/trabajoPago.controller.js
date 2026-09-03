const { save } = require('../config/db');
const trabajo = require('../models/trabajo.model');
const notificaciones = require('../models/notificaciones.model');
const usuarios = require('../models/usuarios.model');

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
  if (body.valor === undefined && typeof body.pagado !== 'boolean') return res.status(400).json({ error: 'Indica el valor o el estado de pago que quieres actualizar.' });

  if (body.valor !== undefined) {
    const valor = body.valor;
    if (valor !== null && (!Number.isFinite(Number(valor)) || Number(valor) < 0)) return res.status(400).json({ error: 'El valor del trabajo no es válido.' });
    turno.valor = valor === null ? null : Number(valor);
  }
  if (typeof body.pagado === 'boolean') turno.pagado = body.pagado;

  await save();
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
