function bloquearCambioJefe(req, res, next) {
  if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'jefeAsignadoId')) {
    return res.status(400).json({ error: 'El jefe asignado queda fijado al crear el trabajo y no puede cambiarse.' });
  }
  next();
}

module.exports = { bloquearCambioJefe };
