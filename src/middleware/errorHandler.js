function errorHandler(err, req, res, next) {
  console.error('[riverospay] Error no manejado:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
}

module.exports = errorHandler;
