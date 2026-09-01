const express = require('express');
const amistades = require('../controllers/amistades.controller');
const ah = require('../middleware/asyncHandler');

const router = express.Router();

router.get('/:userId', ah(amistades.listar));
router.post('/agregar', ah(amistades.agregar));

module.exports = router;
