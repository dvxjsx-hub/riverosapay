const express = require('express');
const auth = require('../controllers/auth.controller');
const ah = require('../middleware/asyncHandler');

const router = express.Router();

router.post('/register', ah(auth.registrar));
router.post('/recuperar', ah(auth.recuperar));
router.post('/nombre', ah(auth.configurarNombre));
router.post('/preferencias', ah(auth.preferencias));
router.post('/cambiar-modo', ah(auth.cambiarModo));
router.post('/eliminar-cuenta', ah(auth.eliminarCuenta));
router.post('/login', ah(auth.login));
router.post('/logout', ah(auth.logout));
// Legado: se conserva durante la migración de cuentas antiguas.
router.post('/role', ah(auth.elegirRol));

module.exports = router;
