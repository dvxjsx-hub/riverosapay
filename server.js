/* ============================================================
   server.js — punto de entrada de Riverosapay (Express + Socket.IO).
   Solo arma la app y arranca; toda la lógica vive en src/.
   ============================================================ */

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');

const { init } = require('./src/config/db');
const { setIO } = require('./src/realtime/io');
const { initSockets } = require('./src/sockets');
const errorHandler = require('./src/middleware/errorHandler');
const { requireUser } = require('./src/middleware/session');

const authRoutes = require('./src/routes/auth.routes');
const adminRoutes = require('./src/routes/admin.routes');
const trabajoRoutes = require('./src/routes/trabajo.routes');
const estudioRoutes = require('./src/routes/estudio.routes');
const eventoRoutes = require('./src/routes/evento.routes');
const verificacionRoutes = require('./src/routes/verificacion.routes');
const amistadesRoutes = require('./src/routes/amistades.routes');
const tesoreriaRoutes = require('./src/routes/tesoreria.routes');

const app = express();

// S4 — cabeceras HTTP de seguridad. La CSP queda desactivada por ahora
// para no interferir con el frontend existente; el resto de Helmet sigue activo.
app.use(helmet({
  contentSecurityPolicy: false
}));

// S4 — límites para evitar cuerpos HTTP excesivamente grandes.
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb', parameterLimit: 100 }));

app.use(express.static(path.join(__dirname, 'public')));

// Health check público para comprobar que la aplicación está viva.
app.get('/api/health', (req, res) => {
  res.json({ ok: true, app: 'riverosapay' });
});

// Autenticación pública y administración tienen sus propios controles.
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Todo el resto de la API requiere una sesión de usuario válida.
app.use('/api', requireUser);
app.use('/api', trabajoRoutes);
app.use('/api/estudio', estudioRoutes);
app.use('/api/evento', eventoRoutes);
app.use('/api', verificacionRoutes);
app.use('/api/amistades', amistadesRoutes);
app.use('/api/tesoreria', tesoreriaRoutes);

app.use(errorHandler);

const server = http.createServer(app);
const io = new Server(server);
setIO(io);
initSockets(io);

(async () => {
  await init();
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => console.log('Riverosapay backend escuchando en el puerto ' + PORT));
})();
