const { db } = require('../config/db');

function crear(data) {
  const movimiento = {
    id: data.id,
    tesoreriaId: data.tesoreriaId,
    jefeId: data.jefeId,
    tesoreroId: data.tesoreroId,
    tipo: data.tipo,
    cantidad: Number(data.cantidad) || 0,
    saldoAnterior: Number(data.saldoAnterior) || 0,
    saldoNuevo: Number(data.saldoNuevo) || 0,
    descripcion: data.descripcion || '',
    fecha: data.fecha || Date.now()
  };
  db.tesoreriaMovimientos.push(movimiento);
  return movimiento;
}

function deRelacion(tesoreriaId) {
  return db.tesoreriaMovimientos
    .filter(m => m.tesoreriaId === tesoreriaId)
    .sort((a, b) => (b.fecha || 0) - (a.fecha || 0));
}

module.exports = { crear, deRelacion };
