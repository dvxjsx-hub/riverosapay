/* ============================================================
   src/realtime/io.js — referencia única a la instancia de
   Socket.IO. server.js la crea una sola vez con setIO(io);
   cualquier controller o modelo la pide con getIO() para emitir
   eventos en tiempo real sin tener que pasarla como parámetro
   por todas las funciones.
   ============================================================ */

let ioInstance = null;

function setIO(io) {
  ioInstance = io;
}

function getIO() {
  if (!ioInstance) throw new Error('Socket.IO todavía no fue inicializado (falta setIO en server.js).');
  return ioInstance;
}

module.exports = { setIO, getIO };
