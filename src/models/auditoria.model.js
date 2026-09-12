/* ============================================================
   src/models/auditoria.model.js — auditoría de seguridad.

   Registra acciones relevantes sin almacenar contraseñas, tokens,
   cookies ni otros secretos. En MongoDB usa una colección propia;
   en modo local usa db.json como respaldo.
   ============================================================ */

const crypto = require('crypto');
const { db, save, getMongoDb, isUsingMongo } = require('../config/db');

const COLECCION = 'auditoria';
let indiceInicializado = false;

function textoSeguro(value, max = 120) {
  if (value === undefined || value === null) return null;
  return String(value).slice(0, max);
}

function normalizarActorType(value) {
  return value === 'admin' ? 'admin' : 'user';
}

async function prepararMongo() {
  if (!isUsingMongo()) return null;
  const mongoDb = getMongoDb();
  if (!mongoDb) return null;

  const collection = mongoDb.collection(COLECCION);
  if (!indiceInicializado) {
    await collection.createIndex({ timestamp: -1 });
    await collection.createIndex({ actorId: 1, timestamp: -1 });
    await collection.createIndex({ action: 1, timestamp: -1 });
    indiceInicializado = true;
  }
  return collection;
}

/**
 * Registra una acción de auditoría.
 *
 * IMPORTANTE: este módulo no acepta ni guarda secretos. Los datos
 * deliberadamente limitados son suficientes para reconstruir quién
 * hizo qué, sobre qué recurso y cuándo.
 */
async function registrar({ actorId, actorType = 'user', action, resource, resourceId = null } = {}) {
  if (!action || !resource) return null;

  const entrada = {
    id: crypto.randomUUID(),
    actorId: textoSeguro(actorId, 120),
    actorType: normalizarActorType(actorType),
    action: textoSeguro(action, 80),
    resource: textoSeguro(resource, 80),
    resourceId: textoSeguro(resourceId, 120),
    timestamp: new Date().toISOString()
  };

  const collection = await prepararMongo();
  if (collection) {
    await collection.insertOne({ _id: entrada.id, ...entrada });
    return entrada;
  }

  if (!Array.isArray(db.auditoria)) db.auditoria = [];
  db.auditoria.push(entrada);
  await save();
  return entrada;
}

module.exports = { registrar };
