/* ============================================================
   src/config/db.js — persistencia híbrida.
   ============================================================ */

const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'db.json');
const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'riverospay';

const EMPTY_DB = {
  users: [], amistades: [], amistadSolicitudes: [], turnos: [], lugares: [], materias: [],
  actividades: [], eventos: [], joinRequests: [], links: [], notificaciones: [],
  trabajoSolicitudes: [], tesorerias: [], tesoreriaSolicitudes: [], tesoreriaMovimientos: [], sessions: []
};

const db = JSON.parse(JSON.stringify(EMPTY_DB));
let mongoDb = null;
let mongoCollection = null;
let mongoSessionsCollection = null;
let usandoMongo = false;

const COLECCIONES_INDEPENDIENTES = {
  users: ['users', ['id', 'username', 'codigoAmistad', 'shareCode']],
  amistades: ['amistades', ['usuarioId', 'amistadId']],
  amistadSolicitudes: ['amistadSolicitudes', ['emisorId', 'receptorId', 'estado']],
  turnos: ['turnos', ['empleadoId', 'jefeAsignadoId', 'lugarId']],
  lugares: ['lugares', ['empleadoId']],
  materias: ['materias', ['empleadoId']],
  actividades: ['actividades', ['empleadoId']],
  eventos: ['eventos', ['empleadoId']],
  joinRequests: ['joinRequests', ['empleadoId', 'jefeId']],
  links: ['links', ['empleadoId', 'jefeId']],
  notificaciones: ['notificaciones', ['usuarioId', 'empleadoId']],
  trabajoSolicitudes: ['trabajoSolicitudes', ['empleadoId', 'jefeId']],
  tesorerias: ['tesorerias', ['jefeId', 'tesoreroId']],
  tesoreriaSolicitudes: ['tesoreriaSolicitudes', ['jefeId', 'tesoreroId', 'estado']],
  tesoreriaMovimientos: ['tesoreriaMovimientos', ['tesoreriaId', 'tipo']]
};

const mongoCollections = {};

function hidratar(source) {
  Object.keys(db).forEach(k => delete db[k]);
  Object.assign(db, JSON.parse(JSON.stringify(EMPTY_DB)), source || {});
  Object.keys(db).forEach(k => { if (!Array.isArray(db[k])) db[k] = []; });
}

function cargarDesdeArchivo() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')); } catch (e) { return {}; }
}

function guardarEnArchivo() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

async function migrarColeccion(clave, collection, indexFields = []) {
  const docs = await collection.find({}).toArray();
  const actuales = Array.isArray(db[clave]) ? db[clave] : [];

  if (!docs.length && actuales.length) {
    const operaciones = actuales.filter(item => item && item.id).map(item => ({
      updateOne: { filter: { _id: item.id }, update: { $set: item }, upsert: true }
    }));
    if (operaciones.length) await collection.bulkWrite(operaciones, { ordered: false });
  }

  const desdeMongo = await collection.find({}).toArray();
  db[clave] = desdeMongo.map(item => {
    const copy = { ...item };
    delete copy._id;
    return copy;
  });

  for (const field of indexFields) await collection.createIndex({ [field]: 1 });
  await mongoCollection.updateOne({ _id: 'riverospay' }, { $set: { [clave]: [] } }, { upsert: true });
}

async function guardarColeccion(clave, collection) {
  if (!collection) return;
  const actuales = Array.isArray(db[clave]) ? db[clave] : [];
  const ids = actuales.filter(item => item && item.id).map(item => item.id);

  if (ids.length) {
    await collection.deleteMany({ _id: { $nin: ids } });
    await collection.bulkWrite(actuales.filter(item => item && item.id).map(item => ({
      updateOne: { filter: { _id: item.id }, update: { $set: item }, upsert: true }
    })), { ordered: false });
  } else {
    await collection.deleteMany({});
  }
}

async function migrarSessions() {
  const docs = await mongoSessionsCollection.find({}).toArray();
  if (!docs.length && Array.isArray(db.sessions) && db.sessions.length) {
    await mongoSessionsCollection.bulkWrite(db.sessions.map(session => ({
      updateOne: { filter: { tokenHash: session.tokenHash }, update: { $set: session }, upsert: true }
    })), { ordered: false });
  }
  db.sessions = [];
  await mongoCollection.updateOne({ _id: 'riverospay' }, { $set: { sessions: [] } }, { upsert: true });
}

async function guardarSessions() {
  if (!mongoSessionsCollection) return;
  const actuales = Array.isArray(db.sessions) ? db.sessions : [];
  const hashes = actuales.filter(s => s && s.tokenHash).map(s => s.tokenHash);
  if (hashes.length) {
    await mongoSessionsCollection.deleteMany({ tokenHash: { $nin: hashes } });
    await mongoSessionsCollection.bulkWrite(actuales.filter(s => s && s.tokenHash).map(s => ({
      updateOne: { filter: { tokenHash: s.tokenHash }, update: { $set: s }, upsert: true }
    })), { ordered: false });
  } else {
    await mongoSessionsCollection.deleteMany({});
  }
}

async function init() {
  if (!MONGODB_URI) {
    hidratar(cargarDesdeArchivo());
    console.log('[riverospay] MONGODB_URI no configurada: usando data/db.json local.');
    return;
  }

  const { MongoClient } = require('mongodb');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  mongoDb = client.db(MONGODB_DB_NAME);
  mongoCollection = mongoDb.collection('estado');
  mongoSessionsCollection = mongoDb.collection('sessions');
  usandoMongo = true;

  const doc = await mongoCollection.findOne({ _id: 'riverospay' });
  if (doc) {
    delete doc._id;
    hidratar(doc);
  } else {
    await mongoCollection.insertOne({ _id: 'riverospay', ...JSON.parse(JSON.stringify(EMPTY_DB)) });
  }

  await mongoSessionsCollection.createIndex({ tokenHash: 1 }, { unique: true });
  await mongoSessionsCollection.createIndex({ userId: 1 });
  await migrarSessions();

  for (const [clave, [nombre, indices]] of Object.entries(COLECCIONES_INDEPENDIENTES)) {
    const collection = mongoDb.collection(nombre);
    mongoCollections[clave] = collection;
    await migrarColeccion(clave, collection, indices);
  }

  console.log('[riverospay] Conectado a MongoDB Atlas.');
}

async function save() {
  if (!usandoMongo || !mongoCollection) {
    guardarEnArchivo();
    return;
  }

  await guardarSessions();
  for (const clave of Object.keys(COLECCIONES_INDEPENDIENTES)) {
    await guardarColeccion(clave, mongoCollections[clave]);
  }

  const estado = { ...db };
  delete estado.sessions;
  for (const clave of Object.keys(COLECCIONES_INDEPENDIENTES)) delete estado[clave];
  await mongoCollection.updateOne({ _id: 'riverospay' }, { $set: estado }, { upsert: true });
}

function getMongoDb() { return mongoDb; }
function getMongoSessionsCollection() { return mongoSessionsCollection; }
function getMongoUsersCollection() { return mongoCollections.users || null; }
function getMongoEventosCollection() { return mongoCollections.eventos || null; }
function isUsingMongo() { return usandoMongo; }

module.exports = {
  db, save, init, getMongoDb, getMongoSessionsCollection,
  getMongoUsersCollection, getMongoEventosCollection, isUsingMongo
};
