const express = require('express');
const amistades = require('../controllers/amistades.controller');
const ah = require('../middleware/asyncHandler');
const { requireUser } = require('../middleware/session');

const router = express.Router();

// Defensa en profundidad: las amistades solo son accesibles con sesión de usuario.
router.use(requireUser);

router.get('/:userId', ah(amistades.listar));
router.post('/agregar', ah(amistades.agregar));

module.exports = router;
