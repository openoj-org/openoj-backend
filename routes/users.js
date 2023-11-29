const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const service = require('../services/userService');



// 是否开放注册
router.get('/user/get-allow-register', service.get_allow_register); // OK

// 获取单个用户信息
router.get('/user/info', service.user_info); // OK

// 获取用户列表
router.get('/user/list', service.user_list); // OK

// 获取可以注册的邮箱后缀列表
router.get('/user/mail-suffix-list', service.mail_suffux_list); // OK

// 获取邮箱修改的时间限制
router.get('/user/mail-change-time', service.mail_changetime);

// 获取用户名修改的时间限制
router.get('/user/username-change-time', service.username_changetime);

// 用户登录
router.post('/user/login', service.login);

// 退出登录
router.post('/user/logout', service.logout);

// 设置是否开放注册
router.post('/user/allow-register', service.allow_register);

// 用户注册
router.post('/user/register', service.register);

// 向邮箱发送验证码
router.post('/user/prepare-mail-code', service.prepare_mailcode);

// 验证验证码是否正确
router.post('/verify-mail-code', service.verify_mailcode);

// 修改用户名
router.post('/user/change-username', service.change_username);

// 修改密码
router.post('/user/change-password', service.change_password);

// 修改签名
router.post('/user/change-signature', service.change_signature);

// 修改邮箱
router.post('/user/change-email', service.change_email);

// 忘记密码后重置
router.post('/user/reset-password', service.reset_password);

// 批量创建账号
router.post('/user/generate-user', service.generate_user);

// 设置可以注册的邮箱后缀
router.post('/user/set-mail-suffix-list', service.set_mail);

// 移除管理员
router.post('/user/unmanage', service.unmanage);

// 设置管理员
router.post('/user/manage', service.manage);

// 移除受信用户
router.post('/user/untrust', service.untrust);

// 设置受信用户
router.post('/user/trust', service.trust);

// 解除封禁
router.post('/user/unban', service.unban);

// 封禁用户
router.post('/user/ban', service.ban);

module.exports = router;

