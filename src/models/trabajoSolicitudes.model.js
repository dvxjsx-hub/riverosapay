const { db } = require('../config/db');

function crear(data) {
  const solicitud = {
    id: data.id,
    jefeId: data.jefeId,
    jefeUsername: data.jefeUsername,
    jefeNombre: data.jefeNombre || data.jefeUsername,
    empleadoId: data.empleadoId,
    empleadoUsername: data.empleadoUsername,
    lugar: data.lugar,
    fecha: data.fecha,
    dia: data.dia || '',
    horaInicio: data.horaInicio,
    horaFin: data.horaFin,
    descripcion: data.descripcion || '',
    fechaCreacion: data.fechaCreacion || Date.now(),
    estado: 'pendiente'
  };
  db.trabajoSolicitudes.push(solicitud);
  return solicitud;
}

function buscarPorId(id) {
  return db.trabajoSolicitudes.find(s => s.id === id);
}

function pendientesDeEmpleado(empleadoId) {
  return db.trabajoSolicitudes.filter(s => s.empleadoId === empleadoId && s.estado === 'pendiente');
}

module.exports = { crear, buscarPorId, pendientesDeEmpleado };