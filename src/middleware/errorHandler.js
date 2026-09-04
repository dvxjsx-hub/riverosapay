function errorHandler(err, req, res, next) {
  console.error('[riverospay] Error no manejado:', err);
  if (res.headersSent) return next(err);

  // Los límites de body-parser/Express se responden como 413,
  // no como un error interno 500.
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({ error: 'La solicitud es demasiado grande.' });
  }

  res.status(500).json({ error: 'Error interno del servidor.' });
}

module.exports = errorHandler;
