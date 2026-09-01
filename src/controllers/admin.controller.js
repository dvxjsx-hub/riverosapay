const { db } = require('../config/db');
const usuarios = require('../models/usuarios.model');
const { save } = require('../config/db');
const { eliminarDatosCuenta } = require('./auth.controller');

function cuentas(req, res) {
  const lista = db.users.map(u => ({
    id: u.id,
    username: u.username,
    nombreCompleto: u.nombreCompleto || null,
    createdAt: u.createdAt || null
  }));
  res.json({ cuentas: lista });
}

async function eliminar(req, res) {
  const { userId } = req.params;
  const user = usuarios.buscarPorId(userId);
  if (!user) return res.status(404).json({ error: 'Cuenta no encontrada.' });

  await eliminarDatosCuenta(userId);
  res.json({ ok: true });
}

module.exports = { cuentas, eliminar };
