const { save } = require('../config/db');
const abonos = require('../models/abonos.model');
const usuarios = require('../models/usuarios.model');
const trabajo = require('../models/trabajo.model');
const auditoria = require('../models/auditoria.model');

function usuarioActual(req) {
  return req.userId || (req.session && req.session.userId) || null;
}

async function crearAbono(req, res) {
  const jefeId = usuarioActual(req);
  const empleadoId = String((req.body && req.body.empleadoId) || '').trim();
  const valor = req.body && req.body.valor;
  const fecha = String((req.body && req.body.fecha) || '').trim();
  const descripcion = String((req.body && req.body.descripcion) || '').trim();

  if (!jefeId) return res.status(401).json({ error: 'Sesión de usuario requerida.' });

  const jefe = usuarios.buscarPorId(jefeId);
  if (!jefe || (jefe.modoActual || jefe.role) !== 'jefe') {
    return res.status(403).json({ error: 'Esta acción solo está disponible en modo BOSS.' });
  }

  if (!empleadoId) return res.status(400).json({ error: 'Selecciona un empleado.' });
  if (empleadoId === jefeId) return res.status(400).json({ error: 'No puedes registrar un abono para ti mismo.' });

  const empleado = usuarios.buscarPorId(empleadoId);
  if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado.' });

  if (!trabajo.tieneTrabajoAsignado(jefeId, empleadoId)) {
    return res.status(403).json({ error: 'Solo puedes registrar abonos para empleados que tienen trabajos asignados por ti.' });
  }

  const numeroValor = Number(valor);
  if (valor === undefined || valor === null || String(valor).trim() === '' || !Number.isFinite(numeroValor) || numeroValor <= 0) {
    return res.status(400).json({ error: 'El valor del abono debe ser mayor que cero.' });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return res.status(400).json({ error: 'La fecha del abono no es válida.' });
  }

  if (descripcion.length > 200) {
    return res.status(400).json({ error: 'La descripción no puede superar 200 caracteres.' });
  }

  const abono = abonos.crear({ jefeId, empleadoId, valor: numeroValor, fecha, descripcion });

  await save();
  await auditoria.registrar({ actorId: jefeId, actorType: 'user', action: 'crear_abono', resource: 'abono', resourceId: abono.id });

  res.json({ ok: true, abono });
}

async function listarAbonos(req, res) {
  const actorId = usuarioActual(req);
  const jefeId = String(req.params.jefeId || '').trim();
  const empleadoId = String(req.params.empleadoId || '').trim();
  if (!actorId) return res.status(401).json({ error: 'Sesión de usuario requerida.' });

  const esJefe = actorId === jefeId;
  const esEmpleado = actorId === empleadoId;
  if (!esJefe && !esEmpleado) return res.status(403).json({ error: 'No tienes permiso para consultar estos abonos.' });

  if (!usuarios.buscarPorId(jefeId) || !usuarios.buscarPorId(empleadoId)) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  if (esJefe && !trabajo.tieneTrabajoAsignado(jefeId, empleadoId)) {
    return res.status(403).json({ error: 'Este empleado no tiene trabajos asignados por ti.' });
  }

  const lista = abonos.listarPorJefeYEmpleado(jefeId, empleadoId);
  const totalAbonos = lista.reduce((total, abono) => total + Number(abono.valor || 0), 0);
  res.json({ abonos: lista, totalAbonos });
}

async function eliminarAbono(req, res) {
  const jefeId = usuarioActual(req);
  const abonoId = String(req.params.abonoId || '').trim();
  if (!jefeId) return res.status(401).json({ error: 'Sesión de usuario requerida.' });

  const jefe = usuarios.buscarPorId(jefeId);
  if (!jefe || (jefe.modoActual || jefe.role) !== 'jefe') {
    return res.status(403).json({ error: 'Esta acción solo está disponible en modo BOSS.' });
  }

  const abono = abonos.buscarPorId(abonoId);
  if (!abono) return res.status(404).json({ error: 'Abono no encontrado.' });
  if (abono.jefeId !== jefeId) return res.status(403).json({ error: 'No puedes eliminar un abono que no registraste tú.' });

  abonos.eliminar(abonoId);
  await save();
  await auditoria.registrar({ actorId: jefeId, actorType: 'user', action: 'eliminar_abono', resource: 'abono', resourceId: abonoId });

  res.json({ ok: true });
}

module.exports = { crearAbono, listarAbonos, eliminarAbono };
