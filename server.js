/* ============================================================
   server.js — punto de entrada de Riverospay (Express + Socket.IO).
   Solo arma la app y arranca; toda la lógica vive en src/.
   ============================================================ */

const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const { init } = require('./src/config/db');
const { setIO } = require('./src/realtime/io');
const { initSockets } = require('./src/sockets');
const errorHandler = require('./src/middleware/errorHandler');

const authRoutes = require('./src/routes/auth.routes');
const trabajoRoutes = require('./src/routes/trabajo.routes');
const estudioRoutes = require('./src/routes/estudio.routes');
const eventoRoutes = require('./src/routes/evento.routes');
const verificacionRoutes = require('./src/routes/verificacion.routes');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api', trabajoRoutes);
app.use('/api/estudio', estudioRoutes);
app.use('/api/evento', eventoRoutes);
app.use('/api', verificacionRoutes);

app.use(errorHandler);

const server = http.createServer(app);
const io = new Server(server);
setIO(io);
initSockets(io);

/* ================= START ================= */

(async () => {
  await init();
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => console.log('Riverospay backend escuchando en el puerto ' + PORT));
})();
