const { db } = require('../config/db');

function buscarPorUsername(username) {
  const uname = (username || '').trim().toLowerCase();
  return db.users.find(u => u.username.toLowerCase() === uname);
}

function buscarPorId(id) {
  return db.users.find(u => u.id === id);
}

function existeUsername(username) {
  return db.users.some(u => u.username.toLowerCase() === (username || '').trim().toLowerCase());
}

function crear(user) {
  db.users.push(user);
}

function eliminar(id) {
  db.users = db.users.filter(u => u.id !== id);
}

function modoActual(u) {
  return u.modoActual || u.role || 'empleado';
}

// forma pública: nunca expone password ni hashes.
function publicUser(u) {
  return {
    id: u.id,
    username: u.username,
    // role/shareCode se conservan temporalmente para módulos antiguos durante la migración.
    role: u.role || null,
    modoActual: modoActual(u),
    nombreCompleto: u.nombreCompleto || null,
    esEstudiante: u.esEstudiante === undefined ? null : u.esEstudiante,
    recibirNotificaciones: u.recibirNotificaciones === undefined ? null : u.recibirNotificaciones,
    codigoAmistad: u.codigoAmistad || null,
    verificada: u.verificada === true,
    shareCode: u.role === 'empleado' ? u.shareCode : undefined
  };
}

module.exports = { buscarPorUsername, buscarPorId, existeUsername, crear, eliminar, publicUser, modoActual };
