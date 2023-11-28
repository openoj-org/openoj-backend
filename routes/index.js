
const express = require('express');
// const boom = require('boom');
const userRouter = require('./users');
const router = express.Router();

router.use('', userRouter); // 注入用户路由模块

module.exports = router;