const express = require('express');
const verificacion = require('../controllers/verificacion.controller');
const ah = require('../middleware/asyncHandler');
const { requireUser } = require('../middleware/session');

const router = express.Router();

// Defensa en profundidad: toda esta área pertenece a usuarios autenticados.
router.use(requireUser);

router.get('/share/:empleadoId', ah(verificacion.obtenerCodigo));
router.post('/verificar', ah(verificacion.enviarSolicitud));

router.get('/notificaciones/:empleadoId', ah(verificacion.listarNotificaciones));
router.post('/notificaciones/:empleadoId/marcar-leidas', ah(verificacion.marcarLeidas));

router.get('/join-requests/:empleadoId', ah(verificacion.solicitudesPendientes));
router.post('/join-requests/:id/responder', ah(verificacion.responderSolicitud));

router.get('/historial/:jefeId', ah(verificacion.historial));

router.get('/verificar/datos/:empleadoId', ah(verificacion.datosEmpleado));
router.get('/verificar/estudio/:empleadoId', ah(verificacion.estudioEmpleado));
router.get('/verificar/evento/:empleadoId', ah(verificacion.eventoEmpleado));

module.exports = router;
