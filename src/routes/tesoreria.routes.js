const express = require('express');
const tesoreria = require('../controllers/tesoreria.controller');
const ah = require('../middleware/asyncHandler');
const { requireUser } = require('../middleware/session');

const router = express.Router();
router.use(requireUser);

router.get('/jefe/:jefeId/tesoreros', ah(tesoreria.listarMisTesoreros));
router.post('/jefe/:jefeId/tesoreros/solicitudes', ah(tesoreria.crearSolicitudTesorero));
router.get('/tesorero/:tesoreroId/solicitudes', ah(tesoreria.listarSolicitudesRecibidas));
router.post('/tesorero/solicitudes/:solicitudId/responder', ah(tesoreria.responderSolicitudTesorero));
router.get('/tesorero/:tesoreroId/relaciones', ah(tesoreria.listarMisRelaciones));

module.exports = router;
