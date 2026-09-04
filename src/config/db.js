/* ============================================================
   src/config/db.js — persistencia híbrida.
   ============================================================ */

const fs = require('fs');
const path = require('path');

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
  tesoreriaMovimientos: [],
  sessions: []
};

const db = JSON.parse(JSON.stringify(EMPTY_DB));
let mongoDb = null;
let mongoCollection = null;
let mongoSessionsCollection = null;
let mongoUsersCollection = null;
let mongoEventosCollection = null;
let mongoTurnosCollection = null;
let mongoLugaresCollection = null;
let mongoMateriasCollection = null;
let usandoMongo = false;

function hidratar(source) {
  Object.keys(db).forEach(k => delete db[k]);
  Object.assign(db, JSON.parse(JSON.stringify(EMPTY_DB)), source || {});
  if (!Array.isArray(db.amistadSolicitudes)) db.amistadSolicitudes = [];
  if (!Array.isArray(db.trabajoSolicitudes)) db.trabajoSolicitudes = [];
  if (!Array.isArray(db.tesorerias)) db.tesorerias = [];
  if (!Array.isArray(db.tesoreriaSolicitudes)) db.tesoreriaSolicitudes = [];
  if (!Array.isArray(db.tesoreriaMovimientos)) db.tesoreriaMovimientos = [];
  if (!Array.isArray(db.sessions)) db.sessions = [];
  if (!Array.isArray(db.users)) db.users = [];
  if (!Array.isArray(db.eventos)) db.eventos = [];
  if (!Array.isArray(db.turnos)) db.turnos = [];
  if (!Array.isArray(db.lugares)) db.lugares = [];
  if (!Array.isArray(db.materias)) db.materias = [];
}

function cargarDesdeArchivo() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')); } catch (e) { return {}; }
}

function guardarEnArchivo() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

async function migrarUsuarios() {
  const docs = await mongoUsersCollection.find({}).toArray();
  if (!docs.length && Array.isArray(db.users) && db.users.length) {
    await mongoUsersCollection.bulkWrite(
      db.users.filter(u => u && u.id).map(user => ({
        updateOne: {
          filter: { _id: user.id },
          update: { $set: user },
          upsert: true
        }
      })),
      { ordered: false }
    );
  }

  const usuariosMongo = await mongoUsersCollection.find({}).toArray();
  db.users = usuariosMongo.map(user => {
    const copy = { ...user };
    delete copy._id;
    return copy;
  });

  await mongoCollection.updateOne({ _id: 'riverospay' }, { $set: { users: [] } }, { upsert: true });
}

async function guardarUsuarios() {
  if (!mongoUsersCollection) return;

  const idsActuales = db.users.filter(u => u && u.id).map(u => u.id);
  if (idsActuales.length) {
    await mongoUsersCollection.deleteMany({ _id: { $nin: idsActuales } });
    await mongoUsersCollection.bulkWrite(
      db.users.filter(u => u && u.id).map(user => ({
        updateOne: {
          filter: { _id: user.id },
          update: { $set: user },
          upsert: true
        }
      })),
      { ordered: false }
    );
  } else {
    await mongoUsersCollection.deleteMany({});
  }
}

async function migrarEventos() {
  const docs = await mongoEventosCollection.find({}).toArray();
  if (!docs.length && Array.isArray(db.eventos) && db.eventos.length) {
    await mongoEventosCollection.bulkWrite(
      db.eventos.filter(e => e && e.id).map(evento => ({
        updateOne: {
          filter: { _id: evento.id },
          update: { $set: evento },
          upsert: true
        }
      })),
      { ordered: false }
    );
  }

  const eventosMongo = await mongoEventosCollection.find({}).toArray();
  db.eventos = eventosMongo.map(evento => {
    const copy = { ...evento };
    delete copy._id;
    return copy;
  });

  await mongoCollection.updateOne({ _id: 'riverospay' }, { $set: { eventos: [] } }, { upsert: true });
}

async function guardarEventos() {
  if (!mongoEventosCollection) return;

  const idsActuales = db.eventos.filter(e => e && e.id).map(e => e.id);
  if (idsActuales.length) {
    await mongoEventosCollection.deleteMany({ _id: { $nin: idsActuales } });
    await mongoEventosCollection.bulkWrite(
      db.eventos.filter(e => e && e.id).map(evento => ({
        updateOne: {
          filter: { _id: evento.id },
          update: { $set: evento },
          upsert: true
        }
      })),
      { ordered: false }
    );
  } else {
    await mongoEventosCollection.deleteMany({});
  }
}

async function migrarColeccionIndependiente(collection, clave, indexFields = []) {
  const docs = await collection.find({}).toArray();
  const datosActuales = Array.isArray(db[clave]) ? db[clave] : [];

  if (!docs.length && datosActuales.length) {
    await collection.bulkWrite(
      datosActuales.filter(item => item && item.id).map(item => ({
        updateOne: {
          filter: { _id: item.id },
          update: { $set: item },
          upsert: true
        }
      })),
      { ordered: false }
    );
  }

  const datosMongo = await collection.find({}).toArray();
  db[clave] = datosMongo.map(item => {
    const copy = { ...item };
    delete copy._id;
    return copy;
  });

  for (const field of indexFields) {
    await collection.createIndex({ [field]: 1 });
  }

  await mongoCollection.updateOne({ _id: 'riverospay' }, { $set: { [clave]: [] } }, { upsert: true });
}

async function guardarColeccionIndependiente(collection, clave) {
  if (!collection) return;

  const datosActuales = Array.isArray(db[clave]) ? db[clave] : [];
  const idsActuales = datosActuales.filter(item => item && item.id).map(item => item.id);

  if (idsActuales.length) {
    await collection.deleteMany({ _id: { $nin: idsActuales } });
    await collection.bulkWrite(
      datosActuales.filter(item => item && item.id).map(item => ({
        updateOne: {
          filter: { _id: item.id },
          update: { $set: item },
          upsert: true
        }
      })),
      { ordered: false }
    );
  } else {
    await collection.deleteMany({});
  }
}

async function init() {
  if (MONGODB_URI) {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    mongoDb = client.db(MONGODB_DB_NAME);
    mongoCollection = mongoDb.collection('estado');
    mongoSessionsCollection = mongoDb.collection('sessions');
    mongoUsersCollection = mongoDb.collection('users');
    mongoEventosCollection = mongoDb.collection('eventos');
    mongoTurnosCollection = mongoDb.collection('turnos');
    mongoLugaresCollection = mongoDb.collection('lugares');
    mongoMateriasCollection = mongoDb.collection('materias');
    usandoMongo = true;

    const doc = await mongoCollection.findOne({ _id: 'riverospay' });
    if (doc) {
      delete doc._id;
      hidratar(doc);
    } else {
      await mongoCollection.insertOne({ _id: 'riverospay', ...JSON.parse(JSON.stringify(EMPTY_DB)) });
    }

    // S5.2: sesiones en colección independiente.
    await mongoSessionsCollection.createIndex({ tokenHash: 1 }, { unique: true });
    await mongoSessionsCollection.createIndex({ userId: 1 });
    if (Array.isArray(db.sessions) && db.sessions.length) {
      await mongoSessionsCollection.bulkWrite(
        db.sessions.map(session => ({
          updateOne: {
            filter: { tokenHash: session.tokenHash },
            update: { $set: session },
            upsert: true
          }
        })),
        { ordered: false }
      );
    }
    db.sessions = [];
    await mongoCollection.updateOne({ _id: 'riverospay' }, { $set: { sessions: [] } }, { upsert: true });

    // S5.3: usuarios en colección independiente.
    await mongoUsersCollection.createIndex({ id: 1 });
    await mongoUsersCollection.createIndex({ username: 1 });
    await mongoUsersCollection.createIndex({ codigoAmistad: 1 });
    await mongoUsersCollection.createIndex({ shareCode: 1 });
    await migrarUsuarios();

    // S5.4: eventos en colección independiente.
    await mongoEventosCollection.createIndex({ id: 1 }, { unique: true });
    await mongoEventosCollection.createIndex({ empleadoId: 1 });
    await migrarEventos();

    // S5.5: turnos, lugares y materias en colecciones independientes.
    await migrarColeccionIndependiente(mongoTurnosCollection, 'turnos', ['empleadoId', 'jefeAsignadoId', 'lugarId']);
    await migrarColeccionIndependiente(mongoLugaresCollection, 'lugares', ['empleadoId']);
    await migrarColeccionIndependiente(mongoMateriasCollection, 'materias', ['empleadoId']);

    console.log('[riverospay] Conectado a MongoDB Atlas.');
  } else {
    hidratar(cargarDesdeArchivo());
    console.log('[riverospay] MONGODB_URI no configurada: usando data/db.json local.');
  }
}

async function save() {
  if (usandoMongo && mongoCollection) {
    // Usuarios, sesiones, eventos, turnos, lugares y materias ya tienen persistencia independiente.
    await guardarUsuarios();
    await guardarEventos();
    await guardarColeccionIndependiente(mongoTurnosCollection, 'turnos');
    await guardarColeccionIndependiente(mongoLugaresCollection, 'lugares');
    await guardarColeccionIndependiente(mongoMateriasCollection, 'materias');
    const estado = { ...db };
    delete estado.users;
    delete estado.sessions;
    delete estado.eventos;
    delete estado.turnos;
    delete estado.lugares;
    delete estado.materias;
    await mongoCollection.updateOne({ _id: 'riverospay' }, { $set: estado }, { upsert: true });
  } else {
    guardarEnArchivo();
  }
}

function getMongoDb() {
  return mongoDb;
}

function getMongoSessionsCollection() {
  return mongoSessionsCollection;
}

function getMongoUsersCollection() {
  return mongoUsersCollection;
}

function getMongoEventosCollection() {
  return mongoEventosCollection;
}

function isUsingMongo() {
  return usandoMongo;
}

module.exports = { db, save, init, getMongoDb, getMongoSessionsCollection, getMongoUsersCollection, getMongoEventosCollection, isUsingMongo };