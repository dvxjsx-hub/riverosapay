const express = require('express');
const admin = require('../controllers/admin.controller');
const ah = require('../middleware/asyncHandler');
const { requireAdmin } = require('../middleware/session');

const router = express.Router();
router.use(requireAdmin);
router.get('/cuentas', ah(admin.cuentas));
router.patch('/cuentas/:userId/verificada', ah(admin.cambiarVerificacion));
router.delete('/cuentas/:userId', ah(admin.eliminar));

module.exports = router;
