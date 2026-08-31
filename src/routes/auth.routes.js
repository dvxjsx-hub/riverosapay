const express = require('express');
const auth = require('../controllers/auth.controller');
const ah = require('../middleware/asyncHandler');

const router = express.Router();

router.post('/register', ah(auth.registrar));
router.post('/recuperar', ah(auth.recuperar));
router.post('/nombre', ah(auth.configurarNombre));
router.post('/preferencias', ah(auth.preferencias));
router.post('/eliminar-cuenta', ah(auth.eliminarCuenta));
router.post('/login', ah(auth.login));
router.post('/role', ah(auth.elegirRol));

module.exports = router;
