const { db, save } = require('../config/db');
const trabajo = require('../models/trabajo.model');
const trabajadores = require('../models/trabajadoresPersonal.model');
const usuarios = require('../models/usuarios.model');
const { newId } = require('../utils/utils');

function usuarioActual(req) { return req.userId || (req.session && req.session.userId) || null; }

function validarBoss(req) {
  const jefeId = usuarioActual(req);
  if (jefeId !== req.params.jefeId) return { ok: false, status: 403, error: 'La identidad del BOSS no coincide con la sesión.' };
  const jefe = usuarios.buscarPorId(jefeId);
  if (!jefe || (jefe.modoActual || jefe.role) !== 'jefe') return { ok: false, status: 403, error: 'Esta acción solo está disponible en modo BOSS.' };
  return { ok: true, jefeId };
}

function datosTrabajo(body) {
  return {
    nombre: String((body && body.nombre) || '').trim(),
    trabajadorId: String((body && body.trabajadorId) || '').trim(),
    lugar: String((body && body.lugar) || '').trim(),
    fecha: String((body && body.fecha) || '').trim(),
    dia: String((body && body.dia) || '').trim(),
    horaInicio: String((body && body.horaInicio) || '').trim(),
    horaFin: String((body && body.horaFin) || '').trim(),
    descripcion: String((body && body.descripcion) || '').trim()
  };
}

async function listar(req, res) {
  const auth = validarBoss(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  res.json({ trabajadores: trabajadores.listarPorJefe(auth.jefeId) });
}

async function crear(req, res) {
  const auth = validarBoss(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const data = datosTrabajo(req.body);
  if (!data.lugar || !data.fecha || !data.horaInicio || !data.horaFin) {
    return res.status(400).json({ error: 'Completa trabajador, lugar, fecha y horario.' });
  }
  if (!data.trabajadorId && !data.nombre) return res.status(400).json({ error: 'Indica un nombre para crear el trabajador personalizado.' });
  if (data.nombre.length > 80) return res.status(400).json({ error: 'El nombre de referencia no puede superar 80 caracteres.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.fecha)) return res.status(400).json({ error: 'La fecha del trabajo no es válida.' });

  const inicio = new Date(`${data.fecha}T${data.horaInicio}`);
  const fin = new Date(`${data.fecha}T${data.horaFin}`);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin <= inicio) {
    return res.status(400).json({ error: 'La hora final debe ser posterior a la hora inicial.' });
  }

  let trabajador;
  if (data.trabajadorId) {
    trabajador = trabajadores.buscarPorId(data.trabajadorId);
    if (!trabajador || trabajador.jefeId !== auth.jefeId) return res.status(404).json({ error: 'Trabajador personalizado no encontrado.' });
  } else {
    trabajador = trabajadores.crear({
      id: newId('per'),
      jefeId: auth.jefeId,
      nombre: data.nombre,
      tipo: 'personal',
      createdAt: Date.now()
    });
  }

  const lug = trabajo.buscarOCrearLugar(trabajador.id, data.lugar);
  const turno = {
    id: newId('trn'),
    empleadoId: trabajador.id,
    lugarId: lug.id,
    fecha: data.fecha,
    dia: data.dia || new Intl.DateTimeFormat('es-CO', { weekday: 'long' }).format(new Date(`${data.fecha}T12:00:00`)),
    horaInicio: data.horaInicio,
    horaFin: data.horaFin,
    descripcion: data.descripcion,
    pagado: false,
    valor: null,
    jefeAsignadoId: auth.jefeId,
    puedeVerAgendaJefe: false,
    eliminacionPendiente: false,
    finalizado: false,
    finalizadoAt: null
  };

  trabajo.crearTurno(turno);
  await save();
  res.json({ ok: true, trabajador, lugar: lug, turno });
}

async function obtener(req, res) {
  const auth = validarBoss(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  const trabajador = trabajadores.buscarPorId(req.params.trabajadorId);
  if (!trabajador || trabajador.jefeId !== auth.jefeId) return res.status(404).json({ error: 'Trabajador personalizado no encontrado.' });
  res.json({ trabajador, ...trabajo.snapshot(trabajador.id), puedeVerAgenda: false, esEstudiante: false });
}

module.exports = { listar, crear, obtener };
