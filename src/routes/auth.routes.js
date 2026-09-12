const express = require('express');
const auth = require('../controllers/auth.controller');
const ah = require('../middleware/asyncHandler');
const { requireUser } = require('../middleware/session');
const { authRateLimit } = require('../middleware/authRateLimit');

const router = express.Router();

router.post('/register', authRateLimit, ah(auth.registrar));
router.post('/recuperar', authRateLimit, ah(auth.recuperar));
router.post('/login', authRateLimit, ah(auth.login));
router.post('/logout', ah(auth.logout));

router.post('/nombre', requireUser, ah(auth.configurarNombre));
router.post('/preferencias', requireUser, ah(auth.preferencias));
router.post('/cambiar-modo', requireUser, ah(auth.cambiarModo));
router.post('/cambiar-clave', requireUser, ah(auth.cambiarClave));
router.post('/codigo-recuperacion', requireUser, ah(auth.obtenerNuevoCodigoRecuperacion));
router.post('/eliminar-cuenta', requireUser, ah(auth.eliminarCuenta));
// Legado: se conserva durante la migración de cuentas antiguas.
router.post('/role', requireUser, ah(auth.elegirRol));

module.exports = router;
