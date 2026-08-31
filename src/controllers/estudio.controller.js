const { save } = require('../config/db');
const estudio = require('../models/estudio.model');
const { newId } = require('../utils/utils');

async function obtenerMaterias(req, res) {
  res.json(estudio.materiasDe(req.params.empleadoId));
}

async function crearMateria(req, res) {
  const empleadoId = req.params.empleadoId;
  const { dia, nombre, horaInicio, horaFin } = req.body || {};
  if (!dia || !nombre || !nombre.trim() || !horaInicio || !horaFin) {
    return res.status(400).json({ error: 'Faltan datos de la materia.' });
  }
  const materia = { id: newId('mat'), empleadoId, dia, nombre: nombre.trim(), horaInicio, horaFin };
  estudio.crearMateria(materia);
  await save();
  estudio.broadcast(empleadoId);
  res.json(materia);
}

/* ---- actividades pendientes (dentro de Estudio) ---- */

async function obtenerActividades(req, res) {
  res.json(estudio.actividadesDe(req.params.empleadoId));
}

async function crearActividad(req, res) {
  const empleadoId = req.params.empleadoId;
  const { nombre, dia, nota } = req.body || {};
  if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'La actividad necesita un nombre.' });
  const actividad = {
    id: newId('act'), empleadoId,
    nombre: nombre.trim(), dia: dia || '', nota: (nota || '').trim(), hecha: false
  };
  estudio.crearActividad(actividad);
  await save();
  estudio.broadcast(empleadoId);
  res.json(actividad);
}

async function actualizarActividad(req, res) {
  const actividad = estudio.buscarActividad(req.params.actividadId);
  if (!actividad) return res.status(404).json({ error: 'Actividad no encontrada.' });
  if (typeof req.body.hecha === 'boolean') actividad.hecha = req.body.hecha;
  await save();
  estudio.broadcast(actividad.empleadoId);
  res.json(actividad);
}

async function eliminarActividad(req, res) {
  const actividad = estudio.buscarActividad(req.params.actividadId);
  if (!actividad) return res.status(404).json({ error: 'Actividad no encontrada.' });
  const empleadoId = actividad.empleadoId;
  estudio.eliminarActividad(actividad.id);
  await save();
  estudio.broadcast(empleadoId);
  res.json({ ok: true });
}

module.exports = {
  obtenerMaterias, crearMateria,
  obtenerActividades, crearActividad, actualizarActividad, eliminarActividad
};
