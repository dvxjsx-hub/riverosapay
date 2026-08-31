const { save } = require('../config/db');
const evento = require('../models/evento.model');
const { newId } = require('../utils/utils');

async function obtenerEventos(req, res) {
  res.json(evento.eventosDe(req.params.empleadoId));
}

async function crearEvento(req, res) {
  const empleadoId = req.params.empleadoId;
  const { lugar, dia, hora, gastoMonto, gastoDescripcion, descripcion } = req.body || {};
  if (!lugar || !lugar.trim() || !dia || !hora) {
    return res.status(400).json({ error: 'Faltan datos del evento.' });
  }
  const nuevoEvento = {
    id: newId('evt'), empleadoId,
    lugar: lugar.trim(), dia, hora,
    gastoMonto: (gastoMonto === undefined || gastoMonto === '') ? null : Number(gastoMonto),
    gastoDescripcion: (gastoDescripcion || '').trim(),
    descripcion: (descripcion || '').trim()
  };
  evento.crearEvento(nuevoEvento);
  await save();
  evento.broadcast(empleadoId);
  res.json(nuevoEvento);
}

module.exports = { obtenerEventos, crearEvento };
