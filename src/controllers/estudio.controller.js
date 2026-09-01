const { save } = require('../config/db');
const estudio = require('../models/estudio.model');
const { newId } = require('../utils/utils');

function asegurarPropietario(req, empleadoId) {
  return (req.userId || (req.session && req.session.userId)) === empleadoId;
}

async function obtenerMaterias(req, res) {
  if (!asegurarPropietario(req, req.params.empleadoId)) return res.status(403).json({ error: 'Solo puedes consultar tu propio Estudio.' });
  res.json(estudio.materiasDe(req.params.empleadoId));
}

async function crearMateria(req, res) {
  const empleadoId = req.params.empleadoId;
  if (!asegurarPropietario(req, empleadoId)) return res.status(403).json({ error: 'Solo puedes modificar tu propio Estudio.' });
  const { dia, nombre, horaInicio, horaFin } = req.body || {};
  if (!dia || !nombre || !nombre.trim() || !horaInicio || !horaFin) return res.status(400).json({ error: 'Faltan datos de la materia.' });
  const materia = { id: newId('mat'), empleadoId, dia, nombre: nombre.trim(), horaInicio, horaFin };
  estudio.crearMateria(materia); await save(); estudio.broadcast(empleadoId); res.json(materia);
}

async function eliminarMateria(req, res) {
  const materia = estudio.buscarMateria(req.params.materiaId);
  if (!materia) return res.status(404).json({ error: 'Materia no encontrada.' });
  if (!asegurarPropietario(req, materia.empleadoId)) return res.status(403).json({ error: 'No puedes eliminar una materia de otra cuenta.' });
  estudio.eliminarMateria(materia.id); await save(); estudio.broadcast(materia.empleadoId); res.json({ ok: true });
}

async function obtenerActividades(req, res) {
  if (!asegurarPropietario(req, req.params.empleadoId)) return res.status(403).json({ error: 'Solo puedes consultar tus propias actividades.' });
  res.json(estudio.actividadesDe(req.params.empleadoId));
}

async function crearActividad(req, res) {
  const empleadoId = req.params.empleadoId;
  if (!asegurarPropietario(req, empleadoId)) return res.status(403).json({ error: 'Solo puedes modificar tus propias actividades.' });
  const { nombre, dia, nota } = req.body || {};
  if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'La actividad necesita un nombre.' });
  const actividad = { id: newId('act'), empleadoId, nombre: nombre.trim(), dia: dia || '', nota: (nota || '').trim(), hecha: false };
  estudio.crearActividad(actividad); await save(); estudio.broadcast(empleadoId); res.json(actividad);
}

async function actualizarActividad(req, res) {
  const actividad = estudio.buscarActividad(req.params.actividadId);
  if (!actividad) return res.status(404).json({ error: 'Actividad no encontrada.' });
  if (!asegurarPropietario(req, actividad.empleadoId)) return res.status(403).json({ error: 'No puedes modificar una actividad de otra cuenta.' });
  if (typeof req.body.hecha === 'boolean') actividad.hecha = req.body.hecha;
  await save(); estudio.broadcast(actividad.empleadoId); res.json(actividad);
}

async function eliminarActividad(req, res) {
  const actividad = estudio.buscarActividad(req.params.actividadId);
  if (!actividad) return res.status(404).json({ error: 'Actividad no encontrada.' });
  if (!asegurarPropietario(req, actividad.empleadoId)) return res.status(403).json({ error: 'No puedes eliminar una actividad de otra cuenta.' });
  estudio.eliminarActividad(actividad.id); await save(); estudio.broadcast(actividad.empleadoId); res.json({ ok: true });
}

module.exports = { obtenerMaterias, crearMateria, eliminarMateria, obtenerActividades, crearActividad, actualizarActividad, eliminarActividad };