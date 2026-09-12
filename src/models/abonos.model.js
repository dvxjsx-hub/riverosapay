const { db } = require('../config/db');
const { newId } = require('../utils/utils');

function listarPorJefeYEmpleado(jefeId, empleadoId) {
  return db.abonos
    .filter(a => a.jefeId === jefeId && a.empleadoId === empleadoId)
    .sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')) || Number(b.createdAt || 0) - Number(a.createdAt || 0));
}

function buscarPorId(id) {
  return db.abonos.find(a => a.id === id) || null;
}

function crear({ jefeId, empleadoId, valor, fecha, descripcion = '' }) {
  const abono = {
    id: newId('abo'),
    jefeId,
    empleadoId,
    valor,
    fecha,
    descripcion,
    createdAt: Date.now()
  };
  db.abonos.push(abono);
  return abono;
}

function eliminar(id) {
  const existe = buscarPorId(id);
  if (!existe) return null;
  db.abonos = db.abonos.filter(a => a.id !== id);
  return existe;
}

module.exports = { listarPorJefeYEmpleado, buscarPorId, crear, eliminar };
