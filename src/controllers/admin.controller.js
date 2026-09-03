const { db, save } = require('../config/db');
const usuarios = require('../models/usuarios.model');
const { eliminarDatosCuenta } = require('./auth.controller');

function cuentas(req, res) {
  const lista = db.users.map(u => ({
    id: u.id,
    username: u.username,
    nombreCompleto: u.nombreCompleto || null,
    createdAt: u.createdAt || null,
    lastLoginAt: u.lastLoginAt || null,
    recoveryConfigured: Boolean(u.recoveryCodeHash),
    verificada: u.verificada === true
  }));
  res.json({ cuentas: lista });
}

async function cambiarVerificacion(req, res) {
  const user = usuarios.buscarPorId(req.params.userId);
  if (!user) return res.status(404).json({ error: 'Cuenta no encontrada.' });
  if (typeof req.body?.verificada !== 'boolean') return res.status(400).json({ error: 'El estado de verificación no es válido.' });
  user.verificada = req.body.verificada;
  await save();
  res.json({ ok: true, verificada: user.verificada });
}

async function eliminar(req, res) {
  const { userId } = req.params;
  const user = usuarios.buscarPorId(userId);
  if (!user) return res.status(404).json({ error: 'Cuenta no encontrada.' });
  await eliminarDatosCuenta(userId);
  res.json({ ok: true });
}

module.exports = { cuentas, cambiarVerificacion, eliminar };
