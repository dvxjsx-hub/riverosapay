const { db } = require('../config/db');

function crearSolicitud(data) {
  const solicitud = {
    id: data.id, jefeId: data.jefeId, jefeUsername: data.jefeUsername,
    jefeNombre: data.jefeNombre || data.jefeUsername, tesoreroId: data.tesoreroId,
    tesoreroUsername: data.tesoreroUsername, tesoreroNombre: data.tesoreroNombre || data.tesoreroUsername,
    fechaCreacion: data.fechaCreacion || Date.now(), estado: 'pendiente'
  };
  db.tesoreriaSolicitudes.push(solicitud); return solicitud;
}
function buscarSolicitud(id) { return db.tesoreriaSolicitudes.find(s => s.id === id); }
function solicitudPendienteEntre(jefeId, tesoreroId) { return db.tesoreriaSolicitudes.find(s => s.jefeId === jefeId && s.tesoreroId === tesoreroId && s.estado === 'pendiente'); }
function relacionActiva(jefeId, tesoreroId) { return db.tesorerias.find(t => t.jefeId === jefeId && t.tesoreroId === tesoreroId && t.estado === 'activa'); }
function crearRelacion(data) {
  const relacion = {
    id: data.id, jefeId: data.jefeId, jefeUsername: data.jefeUsername,
    jefeNombre: data.jefeNombre || data.jefeUsername, tesoreroId: data.tesoreroId,
    tesoreroUsername: data.tesoreroUsername, tesoreroNombre: data.tesoreroNombre || data.tesoreroUsername,
    saldo: 0, estado: 'activa', fechaCreacion: data.fechaCreacion || Date.now(), fechaAceptacion: data.fechaAceptacion || Date.now()
  };
  db.tesorerias.push(relacion); return relacion;
}
function tesorerosDeJefe(jefeId) { return db.tesorerias.filter(t => t.jefeId === jefeId && t.estado === 'activa'); }
function relacionesDeTesorero(tesoreroId) { return db.tesorerias.filter(t => t.tesoreroId === tesoreroId && t.estado === 'activa'); }
function solicitudesRecibidas(tesoreroId) { return db.tesoreriaSolicitudes.filter(s => s.tesoreroId === tesoreroId && s.estado === 'pendiente').sort((a,b) => (b.fechaCreacion||0)-(a.fechaCreacion||0)); }
function crearMovimiento(data) {
  const movimiento = {
    id: data.id, tesoreriaId: data.tesoreriaId, jefeId: data.jefeId, tesoreroId: data.tesoreroId,
    tipo: data.tipo, cantidad: Number(data.cantidad), saldoAnterior: Number(data.saldoAnterior), saldoNuevo: Number(data.saldoNuevo),
    descripcion: data.descripcion || '', fecha: data.fecha || Date.now()
  };
  db.tesoreriaMovimientos.push(movimiento); return movimiento;
}
function movimientosDeRelacion(tesoreriaId) { return db.tesoreriaMovimientos.filter(m => m.tesoreriaId === tesoreriaId).sort((a,b) => (b.fecha||0)-(a.fecha||0)); }
module.exports = { crearSolicitud, buscarSolicitud, solicitudPendienteEntre, relacionActiva, crearRelacion, tesorerosDeJefe, relacionesDeTesorero, solicitudesRecibidas, crearMovimiento, movimientosDeRelacion };
