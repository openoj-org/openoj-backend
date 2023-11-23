
const jwt = require('jsonwebtoken');
const expressJwt = require('express-jwt');
const { PRIVATE_KEY } = require('./constant');

const jwtAuth = expressJwt({

  secret: PRIVATE_KEY,
  credentialsRequired: true,
  getToken: (req) => {
    if (req.headers.authorization) {
      return req.headers.authorization
    } else if (req.query && req.query.cookie) {
      return req.query.cookie
    }
  }
}).unless({
  path: [
    '/',
    '/user/login',
    '/user/register',
    '/user/reset-password'
  ]
})

// jwt-token解析
function decode(req) {
  const token = req.get('Authorization')
  return jwt.verify(token, PRIVATE_KEY);
}

module.exports = {
  jwtAuth,
  decode
}
