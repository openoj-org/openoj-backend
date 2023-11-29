
const express = require('express');
// const boom = require('boom');
const userRouter = require('./users');
const problemRouter = require('./problems');
const router = express.Router();

router.use('/', userRouter); // 注入用户路由模块
router.use('/', problemRouter); // 注入官方题库路由模块
module.exports = router;