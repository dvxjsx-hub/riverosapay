/* ============================================================
   src/config/db.js — persistencia híbrida.
   ============================================================ */

const fs = require('fs');
const path = require('path');

// En desarrollo/producción conserva la ruta actual. Los tests pueden
// inyectar otra ruta para no tocar la base real de data/db.json.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'db.json');
const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'riverospay';

const EMPTY_DB = {
  users: [],
  amistades: [],
  amistadSolicitudes: [],
  turnos: [],
  lugares: [],
  materias: [],
  actividades: [],
  eventos: [],
  joinRequests: [],
  links: [],
  notificaciones: [],
  trabajoSolicitudes: [],
  tesorerias: [],
  tesoreriaSolicitudes: [],
  tesoreriaMovimientos: []
};

const db = JSON.parse(JSON.stringify(EMPTY_DB));
let mongoCollection = null;
let usandoMongo = false;

function hidratar(source) {
  Object.keys(db).forEach(k => delete db[k]);
  Object.assign(db, JSON.parse(JSON.stringify(EMPTY_DB)), source || {});
  if (!Array.isArray(db.amistadSolicitudes)) db.amistadSolicitudes = [];
  if (!Array.isArray(db.trabajoSolicitudes)) db.trabajoSolicitudes = [];
  if (!Array.isArray(db.tesorerias)) db.tesorerias = [];
  if (!Array.isArray(db.tesoreriaSolicitudes)) db.tesoreriaSolicitudes = [];
  if (!Array.isArray(db.tesoreriaMovimientos)) db.tesoreriaMovimientos = [];
}

function cargarDesdeArchivo() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')); } catch (e) { return {}; }
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
    mongoCollection = client.db(MONGODB_DB_NAME).collection('estado');
    usandoMongo = true;
    const doc = await mongoCollection.findOne({ _id: 'riverospay' });
    if (doc) { delete doc._id; hidratar(doc); }
    else await mongoCollection.insertOne({ _id: 'riverospay', ...JSON.parse(JSON.stringify(EMPTY_DB)) });
    console.log('[riverospay] Conectado a MongoDB Atlas.');
  } else {
    hidratar(cargarDesdeArchivo());
    console.log('[riverospay] MONGODB_URI no configurada: usando data/db.json local.');
  }
}

async function save() {
  if (usandoMongo && mongoCollection) await mongoCollection.updateOne({ _id: 'riverospay' }, { $set: db }, { upsert: true });
  else guardarEnArchivo();
}

module.exports = { db, save, init };