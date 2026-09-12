const express = require('express');
const verificacion = require('../controllers/verificacion.controller');
const ah = require('../middleware/asyncHandler');
const { requireUser } = require('../middleware/session');
const { save } = require('../config/db');
const notificaciones = require('../models/notificaciones.model');
const auditoria = require('../models/auditoria.model');

const router = express.Router();

// Defensa en profundidad: toda esta área pertenece a usuarios autenticados.
router.use(requireUser);

router.get('/share/:empleadoId', ah(verificacion.obtenerCodigo));
router.post('/verificar', ah(verificacion.enviarSolicitud));

router.get('/notificaciones/:empleadoId', ah(verificacion.listarNotificaciones));
router.post('/notificaciones/:empleadoId/marcar-leidas', ah(verificacion.marcarLeidas));
router.delete('/notificaciones/:empleadoId/:notificacionId', ah(async (req, res) => {
  const actorId = req.userId || (req.session && req.session.userId) || null;
  if (!actorId || actorId !== req.params.empleadoId) return res.status(403).json({ error: 'No puedes eliminar notificaciones de otra cuenta.' });
  const notificacion = notificaciones.eliminarPorId(actorId, req.params.notificacionId);
  if (!notificacion) return res.status(404).json({ error: 'La notificación ya no existe.' });
  await save();
  await auditoria.registrar({ actorId, actorType: 'user', action: 'eliminar_notificacion', resource: 'notificacion', resourceId: notificacion.id });
  res.json({ ok: true });
}));

router.get('/join-requests/:empleadoId', ah(verificacion.solicitudesPendientes));
router.post('/join-requests/:id/responder', ah(verificacion.responderSolicitud));

router.get('/historial/:jefeId', ah(verificacion.historial));
router.patch('/agenda-permiso/:jefeId', ah(verificacion.actualizarPermisoAgendaGeneral));

router.get('/verificar/datos/:empleadoId', ah(verificacion.datosEmpleado));
router.get('/verificar/estudio/:empleadoId', ah(verificacion.estudioEmpleado));
router.get('/verificar/evento/:empleadoId', ah(verificacion.eventoEmpleado));

module.exports = router;
