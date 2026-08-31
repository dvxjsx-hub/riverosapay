const verificacion = require('../models/verificacion.model');

function initSockets(io) {
  io.on('connection', (socket) => {
    socket.on('register-empleado', ({ empleadoId }) => {
      if (empleadoId) socket.join('emp-' + empleadoId);
    });
    socket.on('register-jefe', ({ jefeId }) => {
      if (jefeId) socket.join('jefe-' + jefeId);
    });
    socket.on('jefe-ver-empleado', ({ jefeId, empleadoId }) => {
      if (verificacion.tieneAcceso(jefeId, empleadoId)) socket.join('emp-' + empleadoId);
    });
  });
}

module.exports = { initSockets };
