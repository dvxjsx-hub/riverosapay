const express = require('express');
const evento = require('../controllers/evento.controller');
const ah = require('../middleware/asyncHandler');
const { requireUser } = require('../middleware/session');

const router = express.Router();
router.use(requireUser);

router.get('/:empleadoId', ah(evento.obtenerEventos));
router.post('/:empleadoId', ah(evento.crearEvento));

module.exports = router;
