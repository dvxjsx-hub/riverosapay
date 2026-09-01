const { db, save } = require('../config/db');
const usuarios = require('../models/usuarios.model');
const amistades = require('../models/amistades.model');
const { newFriendCode } = require('../utils/utils');

function asegurarCodigoAmistad(user) {
  if (!user.codigoAmistad) user.codigoAmistad = newFriendCode(db);
  return user.codigoAmistad;
}

async function listar(req, res) {
  const actorId = req.userId;
  if (actorId !== req.params.userId) return res.status(403).json({ error: 'No puedes consultar las amistades de otra cuenta.' });
  const user = usuarios.buscarPorId(actorId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

  asegurarCodigoAmistad(user);
  const lista = amistades.amistadesDe(user.id).map(a => ({
    id: a.amistadId,
    username: a.amistadUsername,
    nombreCompleto: (() => {
      const amigo = usuarios.buscarPorId(a.amistadId);
      return amigo ? (amigo.nombreCompleto || null) : null;
    })(),
    fecha: a.fecha
  }));
  await save();
  res.json({ codigoAmistad: user.codigoAmistad, amistades: lista });
}

async function agregar(req, res) {
  const actorId = req.userId;
  const usuario = usuarios.buscarPorId(actorId);
  const codigo = String((req.body && req.body.codigo) || '').trim();
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });
  if (!/^\d{8}$/.test(codigo)) return res.status(400).json({ error: 'El código de amistad debe tener 8 dígitos.' });

  asegurarCodigoAmistad(usuario);
  const amigo = db.users.find(u => u.codigoAmistad === codigo);
  if (!amigo) return res.status(404).json({ error: 'Código de amistad no encontrado.' });
  if (amigo.id === usuario.id) return res.status(400).json({ error: 'No puedes agregarte a ti mismo.' });
  if (amistades.existe(usuario.id, amigo.id)) return res.status(409).json({ error: 'Esta persona ya está en tus amistades.' });

  amistades.agregar(usuario.id, amigo.id, amigo.username);
  amistades.agregar(amigo.id, usuario.id, usuario.username);
  await save();

  res.json({
    ok: true,
    amistad: {
      id: amigo.id,
      username: amigo.username,
      nombreCompleto: amigo.nombreCompleto || null,
      fecha: Date.now()
    }
  });
}

module.exports = { listar, agregar };