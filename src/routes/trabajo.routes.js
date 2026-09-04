const express = require('express');
const trabajo = require('../controllers/trabajo.controller');
const trabajadorPersonal = require('../controllers/trabajadorPersonal.controller');
const trabajoPago = require('../controllers/trabajoPago.controller');
const trabajoCongelado = require('../controllers/trabajoCongelado.controller');
const ah = require('../middleware/asyncHandler');
const { requireUser } = require('../middleware/session');
const { bloquearCambioJefe, bloquearTrabajoCongelado, bloquearPagoEmpleadoFinalizado } = require('../middleware/inmutabilidadTrabajo');

const router = express.Router();
router.use(requireUser);

router.get('/mis-jefes/:empleadoId', ah(trabajo.obtenerMisJefes));
router.get('/trabajo/jefe/:jefeId', ah(trabajo.obtenerTrabajosComoJefe));
router.get('/trabajo/jefe/:jefeId/personal', ah(trabajadorPersonal.listar));
router.post('/trabajo/jefe/:jefeId/personal', ah(trabajadorPersonal.crear));
router.get('/trabajo/jefe/:jefeId/personal/:trabajadorId', ah(trabajadorPersonal.obtener));
router.post('/trabajo/jefe/:jefeId/solicitudes', ah(trabajo.crearSolicitudTrabajo));
router.post('/trabajo/solicitudes/:solicitudId/responder', ah(trabajo.responderSolicitudTrabajo));
router.get('/trabajo/:empleadoId', ah(trabajo.obtenerSnapshot));
router.post('/trabajo/:empleadoId/turnos', ah(trabajo.crearTurno));
router.patch('/trabajo/turnos/:turnoId', bloquearCambioJefe, bloquearTrabajoCongelado, ah(trabajo.actualizarTurno));
router.patch('/trabajo/turnos/:turnoId/pago-empleado', bloquearPagoEmpleadoFinalizado, bloquearTrabajoCongelado, ah(trabajoPago.actualizarPagoEmpleado));
router.patch('/trabajo/turnos/:turnoId/permiso-agenda', ah(trabajo.actualizarPermisoAgenda));
router.post('/trabajo/turnos/:turnoId/congelar', ah(trabajoCongelado.congelarTrabajo));
router.post('/trabajo/turnos/:turnoId/finalizar', ah(trabajo.finalizarTurno));
router.delete('/trabajo/turnos/:turnoId', ah(trabajo.eliminarTurno));
router.post('/trabajo/turnos/:turnoId/confirmar-eliminacion', ah(trabajo.confirmarEliminacion));
router.post('/trabajo/turnos/:turnoId/rechazar-eliminacion', ah(trabajo.rechazarEliminacion));

module.exports = router;
