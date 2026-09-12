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

// Health check público: debe responder incluso mientras MongoDB está iniciando.
app.get('/api/health', (req, res) => {
  res.json({ ok: true, app: 'riverosapay' });
});

// La base de datos se inicializa después de abrir el servidor.
// Así Render puede detectar el puerto inmediatamente y no confunde una
// inicialización lenta de MongoDB con un servidor caído.
let dbReady = false;
let dbInitError = null;

// Evita que las rutas de API dependientes de la base se ejecuten antes de que
// la persistencia esté lista. El endpoint /api/health queda fuera de este gate.
app.use('/api', (req, res, next) => {
  if (dbReady) return next();
  if (dbInitError) {
    return res.status(503).json({
      ok: false,
      error: 'Base de datos temporalmente no disponible. Intenta nuevamente.'
    });
  }
  return res.status(503).json({
    ok: false,
    error: 'Base de datos iniciando. Intenta nuevamente en unos segundos.'
  });
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

const PORT = process.env.PORT || 10000;

// IMPORTANTE: abrir el listener NO depende de MongoDB.
// Render necesita encontrar este puerto para considerar el servicio disponible.
server.listen(PORT, '0.0.0.0', () => {
  console.log('Riverosapay backend escuchando en el puerto ' + PORT);

  // MongoDB puede tardar o fallar sin impedir que el proceso HTTP arranque.
  init()
    .then(() => {
      dbReady = true;
      console.log('[riverospay] Inicialización de base de datos completada.');
    })
    .catch((error) => {
      dbInitError = error;
      console.error('[riverospay] Error inicializando la base de datos:', error);
    });
});
