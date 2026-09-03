const { save } = require('../config/db');
const trabajo = require('../models/trabajo.model');
const { getIO } = require('../realtime/io');

function usuarioActual(req) { return req.userId || (req.session && req.session.userId) || null; }

async function congelarTrabajo(req, res) {
  const turno = trabajo.buscarTurnoPorId(req.params.turnoId);
  if (!turno) return res.status(404).json({ error: 'Trabajo no encontrado.' });

  const actorId = usuarioActual(req);
  if (!turno.jefeAsignadoId || actorId !== turno.jefeAsignadoId) {
    return res.status(403).json({ error: 'Solo el BOSS asignado puede congelar este trabajo.' });
  }
  if (turno.finalizado !== true) {
    return res.status(400).json({ error: 'Solo puedes congelar un trabajo que ya haya finalizado.' });
  }
  if (turno.congelado === true) {
    return res.status(409).json({ error: 'Este trabajo ya está congelado.' });
  }

  turno.congelado = true;
  turno.congeladoAt = new Date().toISOString();
  await save();
  trabajo.broadcast(turno.empleadoId);

  try { getIO().to('jefe-' + actorId).emit('trabajo:update'); } catch (_) {}
  res.json({ ok: true, turno });
}

module.exports = { congelarTrabajo };
