const express = require('express');
const trabajo = require('../controllers/trabajo.controller');
const ah = require('../middleware/asyncHandler');
const { requireUser } = require('../middleware/session');

const router = express.Router();
router.use(requireUser);

router.get('/mis-jefes/:empleadoId', ah(trabajo.obtenerMisJefes));
router.get('/trabajo/jefe/:jefeId', ah(trabajo.obtenerTrabajosComoJefe));
router.get('/trabajo/:empleadoId', ah(trabajo.obtenerSnapshot));
router.post('/trabajo/:empleadoId/turnos', ah(trabajo.crearTurno));
router.patch('/trabajo/turnos/:turnoId', ah(trabajo.actualizarTurno));
router.delete('/trabajo/turnos/:turnoId', ah(trabajo.eliminarTurno));
router.post('/trabajo/turnos/:turnoId/confirmar-eliminacion', ah(trabajo.confirmarEliminacion));
router.post('/trabajo/turnos/:turnoId/rechazar-eliminacion', ah(trabajo.rechazarEliminacion));

module.exports = router;
