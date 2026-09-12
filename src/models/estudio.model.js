const { db } = require('../config/db');
const { getIO } = require('../realtime/io');

function broadcast(empleadoId) {
  const materias = db.materias.filter(m => m.empleadoId === empleadoId);
  const actividades = db.actividades.filter(a => a.empleadoId === empleadoId);
  getIO().to('emp-' + empleadoId).emit('estudio:update', { materias, actividades });
}

function materiasDe(empleadoId) {
  return db.materias.filter(m => m.empleadoId === empleadoId);
}

function crearMateria(materia) {
  db.materias.push(materia);
}

function buscarMateria(id) {
  return db.materias.find(m => m.id === id);
}

function actualizarMateria(id, cambios) {
  const materia = buscarMateria(id);
  if (!materia) return null;
  Object.assign(materia, cambios);
  return materia;
}

function eliminarMateria(id) {
  db.materias = db.materias.filter(m => m.id !== id);
}

function actividadesDe(empleadoId) {
  return db.actividades.filter(a => a.empleadoId === empleadoId);
}

function buscarActividad(id) {
  return db.actividades.find(a => a.id === id);
}

function crearActividad(actividad) {
  db.actividades.push(actividad);
}

function eliminarActividad(id) {
  db.actividades = db.actividades.filter(a => a.id !== id);
}

module.exports = {
  broadcast, materiasDe, crearMateria, buscarMateria, actualizarMateria, eliminarMateria,
  actividadesDe, buscarActividad, crearActividad, eliminarActividad
};
