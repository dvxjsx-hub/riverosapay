const express = require('express');
const estudio = require('../controllers/estudio.controller');
const ah = require('../middleware/asyncHandler');

const router = express.Router();

router.get('/:empleadoId', ah(estudio.obtenerMaterias));
router.post('/:empleadoId', ah(estudio.crearMateria));

router.get('/:empleadoId/actividades', ah(estudio.obtenerActividades));
router.post('/:empleadoId/actividades', ah(estudio.crearActividad));
router.patch('/actividades/:actividadId', ah(estudio.actualizarActividad));
router.delete('/actividades/:actividadId', ah(estudio.eliminarActividad));

module.exports = router;
