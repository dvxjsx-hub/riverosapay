const express = require('express');
const amistades = require('../controllers/amistades.controller');
const ah = require('../middleware/asyncHandler');
const { requireUser } = require('../middleware/session');

const router = express.Router();
router.use(requireUser);

router.get('/:userId', ah(amistades.listar));
router.post('/agregar', ah(amistades.agregar));
router.post('/solicitudes/:solicitudId/responder', ah(amistades.responder));
router.post('/eliminar', ah(amistades.eliminar));

module.exports = router;
