const express = require('express');
const trabajo = require('../controllers/trabajo.controller');
const trabajoPago = require('../controllers/trabajoPago.controller');
const ah = require('../middleware/asyncHandler');
const { requireUser } = require('../middleware/session');
const { bloquearCambioJefe } = require('../middleware/inmutabilidadTrabajo');

const router = express.Router();
router.use(requireUser);

router.get('/mis-jefes/:empleadoId', ah(trabajo.obtenerMisJefes));
router.get('/trabajo/jefe/:jefeId', ah(trabajo.obtenerTrabajosComoJefe));
router.post('/trabajo/jefe/:jefeId/solicitudes', ah(trabajo.crearSolicitudTrabajo));
router.post('/trabajo/solicitudes/:solicitudId/responder', ah(trabajo.responderSolicitudTrabajo));
router.get('/trabajo/:empleadoId', ah(trabajo.obtenerSnapshot));
router.post('/trabajo/:empleadoId/turnos', ah(trabajo.crearTurno));
router.patch('/trabajo/turnos/:turnoId', bloquearCambioJefe, ah(trabajo.actualizarTurno));
router.patch('/trabajo/turnos/:turnoId/pago-empleado', ah(trabajoPago.actualizarPagoEmpleado));
router.post('/trabajo/turnos/:turnoId/finalizar', ah(trabajo.finalizarTurno));
router.delete('/trabajo/turnos/:turnoId', ah(trabajo.eliminarTurno));
router.post('/trabajo/turnos/:turnoId/confirmar-eliminacion', ah(trabajo.confirmarEliminacion));
router.post('/trabajo/turnos/:turnoId/rechazar-eliminacion', ah(trabajo.rechazarEliminacion));

module.exports = router;
