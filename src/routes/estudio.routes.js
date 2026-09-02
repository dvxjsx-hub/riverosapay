const express = require('express');
const estudio = require('../controllers/estudio.controller');
const ah = require('../middleware/asyncHandler');
const { requireUser } = require('../middleware/session');

const router = express.Router();
router.use(requireUser);

router.get('/:empleadoId', ah(estudio.obtenerMaterias));
router.post('/:empleadoId', ah(estudio.crearMateria));
router.patch('/materias/:materiaId', ah(estudio.actualizarMateria));
router.delete('/materias/:materiaId', ah(estudio.eliminarMateria));

router.get('/:empleadoId/actividades', ah(estudio.obtenerActividades));
router.post('/:empleadoId/actividades', ah(estudio.crearActividad));
router.patch('/actividades/:actividadId', ah(estudio.actualizarActividad));
router.delete('/actividades/:actividadId', ah(estudio.eliminarActividad));

module.exports = router;
