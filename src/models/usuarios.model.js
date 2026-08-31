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

// forma "pública" del usuario: lo que se le puede devolver al cliente sin exponer password/hashes
function publicUser(u) {
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    nombreCompleto: u.nombreCompleto || null,
    esEstudiante: u.esEstudiante === undefined ? null : u.esEstudiante,
    recibirNotificaciones: u.recibirNotificaciones === undefined ? null : u.recibirNotificaciones,
    shareCode: u.role === 'empleado' ? u.shareCode : undefined
  };
}

module.exports = { buscarPorUsername, buscarPorId, existeUsername, crear, eliminar, publicUser };
