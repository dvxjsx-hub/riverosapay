const verificacion = require('../models/verificacion.model');
const { readSession } = require('../middleware/session');

function initSockets(io) {
  io.use((socket, next) => {
    const session = readSession(socket.request);
    if (!session || session.type !== 'user' || !session.userId) return next(new Error('Sesión de usuario requerida.'));
    socket.userId = session.userId;
    next();
  });

  io.on('connection', (socket) => {
    socket.on('register-empleado', ({ empleadoId } = {}) => {
      if (empleadoId === socket.userId) socket.join('emp-' + socket.userId);
    });

    socket.on('register-jefe', ({ jefeId } = {}) => {
      if (jefeId === socket.userId) socket.join('jefe-' + socket.userId);
    });

    socket.on('jefe-ver-empleado', ({ jefeId, empleadoId } = {}) => {
      if (jefeId !== socket.userId) return;
      if (verificacion.tieneAcceso(socket.userId, empleadoId)) socket.join('emp-' + empleadoId);
    });
  });
}

module.exports = { initSockets };