const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const service = require('../services/forumService');

router.get('/forum/list', service.list);

router.get('/forum/info', service.info);

router.get('/forum/comment', service.comment);

router.get('/forum/post', service.post);

module.exports = router;