const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const service = require('../services/emulateService');

router.get('/emulate/submit', service.submit);

router.get('/emulate/generate', service.generate);

module.exports = router;