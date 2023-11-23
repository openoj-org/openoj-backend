/**
 * 描述: 初始化路由信息，自定义全局异常处理
 * 作者: Jack Chen
 * 日期: 2020-06-19
*/

const express = require('express');
// const boom = require('boom');
const userRouter = require('./users');
const { jwtAuth, decode } = require('../utils/user-jwt');
const router = express.Router();

router.use(jwtAuth);

router.use('/user', userRouter); // 注入用户路由模块

router.use((err, req, res, next) => {
  console.log('err===', err);
  if (err && err.name === 'UnauthorizedError') {
    const { status = 401, message } = err;
    res.status(status).json({
      code: status,
      message: 'token失效,请重新登录',
      data: null
    })
  } else {
    const { output } = err || {};
    const errCode = (output && output.statusCode) || 500;
    const errMsg = (output && output.payload && output.payload.error) || err.message;
    res.status(errCode).json({
      code: errCode,
      message: errMsg
    })
  }
})

module.exports = router;