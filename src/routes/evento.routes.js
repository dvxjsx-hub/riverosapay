const express = require('express');
const evento = require('../controllers/evento.controller');
const ah = require('../middleware/asyncHandler');

const router = express.Router();

router.get('/:empleadoId', ah(evento.obtenerEventos));
router.post('/:empleadoId', ah(evento.crearEvento));

module.exports = router;
