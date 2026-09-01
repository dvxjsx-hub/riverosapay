const { save } = require('../config/db');
const evento = require('../models/evento.model');
const { newId } = require('../utils/utils');

function esPropietario(req, empleadoId) {
  return (req.userId || (req.session && req.session.userId)) === empleadoId;
}

async function obtenerEventos(req, res) {
  if (!esPropietario(req, req.params.empleadoId)) return res.status(403).json({ error: 'Solo puedes consultar tus propios eventos.' });
  res.json(evento.eventosDe(req.params.empleadoId));
}

async function crearEvento(req, res) {
  const empleadoId = req.params.empleadoId;
  if (!esPropietario(req, empleadoId)) return res.status(403).json({ error: 'Solo puedes crear eventos para tu propia cuenta.' });
  const { lugar, dia, hora, gastoMonto, gastoDescripcion, descripcion } = req.body || {};
  if (!lugar || !lugar.trim() || !dia || !hora) return res.status(400).json({ error: 'Faltan datos del evento.' });
  const nuevoEvento = { id: newId('evt'), empleadoId, lugar: lugar.trim(), dia, hora, gastoMonto: (gastoMonto === undefined || gastoMonto === '') ? null : Number(gastoMonto), gastoDescripcion: (gastoDescripcion || '').trim(), descripcion: (descripcion || '').trim() };
  evento.crearEvento(nuevoEvento); await save(); evento.broadcast(empleadoId); res.json(nuevoEvento);
}

module.exports = { obtenerEventos, crearEvento };