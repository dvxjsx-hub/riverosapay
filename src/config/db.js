/* ============================================================
   src/config/db.js — persistencia híbrida.

   Si existe la variable de entorno MONGODB_URI, todo se guarda
   en MongoDB Atlas (persiste de verdad entre despliegues y
   reinicios de Render, y entre celulares distintos).

   Si NO existe MONGODB_URI, se guarda en data/db.json local
   (sirve para probar en Termux, pero en Render gratis se puede
   perder al reiniciar el servicio — por eso conviene configurar
   MONGODB_URI en producción, ver PROYECTO.txt).
   ============================================================ */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'db.json');
const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'riverospay';

const EMPTY_DB = {
  users: [],         // { id, username, password(hash), role, shareCode, modoActual, codigoAmistad }
  amistades: [],     // { id, usuarioId, amistadId, amistadUsername, fecha }
  turnos: [],        // { id, empleadoId, lugarId, fecha, dia, horaInicio, horaFin, descripcion, pagado, valor, jefeAsignadoId }
  lugares: [],       // { id, empleadoId, nombre }
  materias: [],      // { id, empleadoId, dia, nombre, horaInicio, horaFin }
  actividades: [],   // { id, empleadoId, dia, nombre, nota, hecha }
  eventos: [],       // { id, empleadoId, lugar, dia, hora, gastoMonto, gastoDescripcion, descripcion }
  joinRequests: [],  // legado: solicitudes de verificación antiguas
  links: [],         // legado: vínculos jefe-empleado antiguos
  notificaciones: [] // { id, usuarioId, empleadoId?, tipo, modoDestino, fecha, leida, ...datos }
};

// objeto ESTABLE: nunca se reasigna, solo se muta por dentro,
// para que el resto de la app pueda seguir usando `db.users.push(...)` etc.
const db = JSON.parse(JSON.stringify(EMPTY_DB));

let mongoCollection = null;
let usandoMongo = false;

function hidratar(source) {
  Object.keys(db).forEach(k => delete db[k]);
  Object.assign(db, JSON.parse(JSON.stringify(EMPTY_DB)), source || {});
}

function cargarDesdeArchivo() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function guardarEnArchivo() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

async function init() {
  if (MONGODB_URI) {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const coleccion = client.db(MONGODB_DB_NAME).collection('estado');
    mongoCollection = coleccion;
    usandoMongo = true;
    const doc = await coleccion.findOne({ _id: 'riverospay' });
    if (doc) {
      delete doc._id;
      hidratar(doc);
    } else {
      await coleccion.insertOne({ _id: 'riverospay', ...JSON.parse(JSON.stringify(EMPTY_DB)) });
    }
    console.log('[riverospay] Conectado a MongoDB Atlas — la info persiste entre despliegues y dispositivos.');
  } else {
    hidratar(cargarDesdeArchivo());
    console.log('[riverospay] MONGODB_URI no configurada: usando data/db.json local. En Render gratis esto puede reiniciarse — ver PROYECTO.txt.');
  }
}

async function save() {
  if (usandoMongo && mongoCollection) {
    await mongoCollection.updateOne({ _id: 'riverospay' }, { $set: db }, { upsert: true });
  } else {
    guardarEnArchivo();
  }
}

module.exports = { db, save, init };
