
const { querySql, queryOne, modifysql } = require('../utils/index');
const md5 = require('../utils/md5');
const boom = require('boom');
const { body, validationResult } = require('express-validator');
const { 
  CODE_ERROR,
  CODE_SUCCESS,
} = require('../utils/constant');
const { decode } = require('../utils/user-jwt');
const nodemail = require('../utils/nodemailer');
const { select_user_by_id, select_users_by_param_order, select_user_by_name,
        select_full_user_by_email, select_full_user_by_id, select_full_user_by_name,
        insert_user, update_user, delete_user, select_email_suffixes, select_user_by_email } = require('../CURDs/userCURD');
var allowregister = false; 
var haveList = false;
var fs = require("fs");
const { error } = require('console');
const { setCookie } = require('undici-types');
const { user } = require('../db/dbConfig');

// 检查器函数, func 为 CURD 函数, isDefault 表示是否使用默认 JSON 解析
function validateFunction(req, res, next, func, isDefault) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const [{ message }] = err.errors;
    next(boom.badRequest(message));
  } else {
    isDefault ?
    func(req, res, next)
    .then(normalObj => {
      res.json(normalObj);
    })
    .catch(errorObj => {
      res.json(errorObj);
    }) : func(req, res, next)
    .catch(errorObj => {
      res.json(errorObj)
    });
  }
}

// 是否开放注册
function get_allow_register(req, res, next) {//
  validateFunction(req, res, next, (req, res, next) => {
    res.json({
      success: true,
      message: '查询成功',
      allow: allowregister
    });
  }, false);
}

// 获取单个用户信息
function user_info(req, res, next) {//
  validateFunction(req, res, next, (req, res, next) => {
    let { id } = req.body;
    return select_user_by_id(id)
    .then(normalObj => {
      let {success, message, username, character, signature, registerTime, pas, mail} = normalObj;
      res.json({success, message, username, character, signature, registerTime, pas, mail});
    });
  }, false);
}

// 获取用户列表
function user_list(req, res, next) {//
  validateFunction(req, res, next, (req, res, next) => {
    let { order, increase, usernameKeyword, start, end } = req.body;
    return select_users_by_param_order(order, increase, usernameKeyword, start, end);
  }, true);
}

// 获取可以注册的邮箱后缀列表
function mail_suffux_list(req, res, next) {//
  validateFunction(req, res, next, (req, res, next) => {
    return select_email_suffixes();
  }, true);
}

// 获取邮箱修改的时间限制
function mail_changetime(req, res, next) {//
  validateFunction(req, res, next, (req, res, next) => {
    let id = req.signedCookies.user_id
    return select_user_by_id(id)
    .then(normalObj => {
      if(normalObj.success) {
        res.json({
          code: CODE_SUCCESS,
          success: true,
        	message: '查询成功',
          // 据下次修改邮箱的等待时间
          time: Math.max(31356000000 - new Date().getTime() + normalObj.emailChangeTime, 0)
        });
      } else {
        res.json({
          code: CODE_ERROR,
          success: false,
        	message: normalObj.message
        });
      }
    });
  }, false);
}

// 获取用户名修改的时间限制
function username_changetime(req, res, next) {//
  validateFunction(req, res, next, (req, res, next) => {
    let id = req.signedCookies.user_id
    return select_user_by_id(id)
    .then(normalObj => {
      if(normalObj.success) {
        res.json({
          code: CODE_SUCCESS,
          success: true,
        	message: '查询成功',
          // 据下次修改用户名的等待时间
          time: Math.max(1209600000 - new Date().getTime() + normalObj.emailChangeTime, 0)
        });
      } else {
        res.json({
          code: CODE_ERROR,
          success: false,
        	message: normalObj.message
        });
      }
    });
  }, false);
}

// 用户登录
function login(req, res, next) {//
  validateFunction(req, res, next, (req, res, next) => {
    let { usernameOrMail, passwordCode } = req.body;
    let userObj = null;
    select_full_user_by_email(usernameOrMail)
    .then(usr => {
      if (usr.success) {
        userObj = {
          id: usr.userInfo.user_id,
          passwordHash: usr.userInfo.user_password_hash
        };
      }
    })
    .catch(errorObj => {
      res.json(errorObj);
    });
    select_full_user_by_name(usernameOrMail)
    .then(usr => {
      if (usr.success) {
        userObj = {
          id: usr.userInfo.user_id,
          passwordHash: usr.userInfo.user_password_hash
        };
      }
    })
    .catch(errorObj => {
      res.json(errorObj);
    });

    if (userObj == null || userObj.passwordHash != passwordCode) {
      res.status(CODE_ERROR).json({
        success: false,
        message: '用户名或密码错误'
      });
    } else {
      select_full_user_by_id(userObj.id)
      .then(usr => {
        if (usr.success) {
          res.cookie('user_id', userObj.id, {maxAge: 3600000, signed: true})
          res.json({
            code: CODE_SUCCESS,
            success: true,
            message: '登录成功',
            username: usr.userInfo.user_name,
            character: usr.userInfo.user_role,
            id: userObj.id
          })
        }
      })
      .catch(errorObj => {
        res.json(errorObj);
      });
    }});
}

// 退出登录
function logout(req, res, next) {//
  validateFunction(req, res, next, (req, res, next) => {
    res.cookie('user_id', req.signedCookies.user_id, {maxAge: 0, signed: true})
  }, false);
}

// 设置是否开放注册
function allow_register(req, res, next) {//
  validateFunction(req, res, next, (req, res, next) => {
    let id = req.signedCookies.user_id
    let { cookie, allow } = req.body
    return select_user_by_id(id)
    .then(normalObj => {
      if(normalObj.success) {
        if(normalObj.character == 0) {
          allow_register = allow;
          res.json({
            code: CODE_SUCCESS,
            success: true,
            message: '设置成功',
          });
        } else {
          res.json({
            code: CODE_ERROR,
            success: false,
            message: '无设置权限',
          });
        }
      } else {
        res.json({
          code: CODE_ERROR,
          success: false,
        	message: normalObj.message
        });
      }
    });
  }, false);
}

// 用户注册
function register(req, res, next) {//
  validateFunction(req, res, next, (req, res, next) => {
    let { sessionId, username, passwordHash, signature} = req.body;
    if(username.length < 3 || username.length > 20) {
      res.status(CODE_ERROR).json({
        success: false,
        message: '用户名长度为[3,20]'
      });
      return;
    }
    if(signature.length > 100) {
      res.status(CODE_ERROR).json({
        success: false,
        message: '用户签名长度应小于100'
      });
      return;
    }
    select_user_by_name(username)
    .then(normalObj => {
      if(normalObj.success) {
        res.status(CODE_ERROR).json({
          success: false,
          message: '用户名已存在'
        });
        return;
      }
    });
    select_emailcode_by_id(sessionId)
    .then(normalObj => {
      if(normalObj.success) {
        let useremail = normalObj.email;
        select_user_by_email(useremail)
        .then(norObj => {
          if(norObj.success) {
            res.status(CODE_ERROR).json({
              success: false,
              message: '邮箱已注册'
            });
            return;
          }
        });
        return insert_user(username,passwordHash,useremail,3,signature)
        .then(result => {
          if(result.success) {
            res.cookie('user_id', result.id, {maxAge: 3600000, signed: true})
            res.json({
              code: CODE_SUCCESS,
              success: true,
              message: '注册成功',
              id: result.id
            });
          } else {
            res.json({
              code: CODE_ERROR,
              success: false,
              message: result.message
            });
          }
        })
      } else {
        res.json({
          code: CODE_ERROR,
          success: false,
        	message: normalObj.message
        });
      }
    });
  }, false);
}

// 向邮箱发送验证码
function prepare_mailcode(req, res, next) {//
  validateFunction(req, res, next, (req, res, next) => {
    let { useremail } = req.body;
    if(useremail.length > 50) {
      res.status(CODE_ERROR).json({
        success: false,
        message: '邮箱长度应小于50'
      });
      return;
    }
    var code = createSixNum();
    time = new Date().getTime()
    var mail = {
      from: '<zxbzxb20@163.com>',
      subject: '接受凭证',
      to: useremail,
      text: '用' + code + '作为你的验证码'//发送验证码
    };
    nodemail(mail)
    .then(result => {
      if(!result.success) {
        res.status(CODE_ERROR).json({
          success: false,
          message: result.message
        });
        return;
      }
    });
    insert_mail_code(code, useremail)
    .then(result => {
      if(result.success) {
        res.json({ 
          code: CODE_SUCCESS, 
          message: '验证码已发送', 
          sessionId: result.id
        })
      } else {
        res.status(CODE_ERROR).json({
          success: false,
          message: result.message
        });
      }
    })
  }, false);
}

// 验证验证码是否正确
function verify_mailcode(req, res, next) {//
  validateFunction(req, res, next, (req, res, next) => {
    let { mailcode_id,mailcode_code } = req.body;
    select_mail_code_by_id(mailcode_id)
    .then(result => {
      if (!result.success) {
        res.json({ 
          code: CODE_ERROR, 
          success: false,
          message: '验证码不存在'
        })
      } else {
        if(mailcode_code == result.code_number)
        {
          res.json({ 
            code: CODE_SUCCESS, 
            success: true,
            message: '验证通过', 
            sessionId: mailcode_id
          })
        } else {
          res.json({ 
            code: CODE_ERROR, 
            success: false,
            message: '验证码错误'
          })
        }
      }
    })
  }, false);
}

// 修改用户名
function change_username(req, res, next) {//
  validateFunction(req, res, next, (req, res, next) => {
    let { cookie, username } = req.body;
    let id = req.signedCookies.user_id
    select_user_by_id(id)
    .then(normalObj => {
      if(normalObj.success) {
        return update_user(id,'user_name',username)
        .then(result => {
          res.json({
            success: result.success,
            message: result.message
          })
        });
      } else {
        res.json({
          code: CODE_ERROR,
          success: false,
        	message: normalObj.message
        });
      }
    });
  }, false);
}

// 修改密码
function change_password(req, res, next) {//
  validateFunction(req, res, next, (req, res, next) => {
    let { cookie, passwordHash } = req.body;
    let id = req.signedCookies.user_id
    select_user_by_id(id)
    .then(normalObj => {
      if(normalObj.success) {
        return update_user(id,'user_password_hash',passwordHash)
        .then(result => {
          res.json({
            success: result.success,
            message: result.message
          })
        });
      } else {
        res.json({
          code: CODE_ERROR,
          success: false,
        	message: normalObj.message
        });
      }
    });
  }, false);
}

// 修改签名
function change_signature(req, res, next) {//
  validateFunction(req, res, next, (req, res, next) => {
    let { cookie, signature } = req.body;
    let id = req.signedCookies.user_id
    select_user_by_id(id)
    .then(normalObj => {
      if(normalObj.success) {
        return update_user(id,'user_signature',signature)
        .then(result => {
          res.json({
            success: result.success,
            message: result.message
          })
        });
      } else {
        res.json({
          code: CODE_ERROR,
          success: false,
        	message: normalObj.message
        });
      }
    });
  }, false);
}

// 修改邮箱]
function change_email(req, res, next) {//
  validateFunction(req, res, next, (req, res, next) => {
    let { cookie, sessionId } = req.body;
    let id = req.signedCookies.user_id
    select_user_by_id(id)
    .then(normalObj => {
      if(normalObj.success) {
        select_mail_code_by_id(sessionId)
        .then(norObj => {
          if(norObj.success) {
            return update_user(id,'user_email',norObj.mail)
            .then(result => {
              res.json({
                success: result.success,
                message: result.message
              })
            });
          } else {
            res.json({
              code: CODE_ERROR,
              success: false,
              message: norObj.message
            })
          }
        });
      } else {
        res.json({
          code: CODE_ERROR,
          success: false,
        	message: normalObj.message
        });
      }
    });
  }, false);
}

// 忘记密码后重置
function reset_password(req, res, next) {//
  validateFunction(req, res, next, (req, res, next) => {
    let { sessionId, newPassword } = req.body;
    select_mail_code_by_id(sessionId)
    .then(normalObj => {
      if(normalObj.success) {
        select_full_user_by_email(normalObj.mail)
        .then(norObj => {
          if(norObj.success) {
            return update_user(norObj.userInfo.user_id,'user_password_hash',newPassword)
            .then(result => {
              res.json({
                success: result.success,
                message: result.message
              })
            });
          } else {
            res.json({
              code: CODE_ERROR,
              success: false,
              message: norObj.message
            })
          }
        });
      } else {
        res.json({
          code: CODE_ERROR,
          success: false,
        	message: normalObj.message
        });
      }
    });
  }, false);
}

// 批量创建账号
function generate_user(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let { cookie, usernamePrefix, passwordHash, count} = req.body;
    let id = req.signedCookies.user_id
    if(id == 1) {
      for (var i = 1 ; i <= count ; i++) {
        let user_name = usernamePrefix+i.toString();
        insert_user(user_name,passwordHash,null,3,null)
        .then(user => {
          if (!user.success) {
            res.json({ 
              code: CODE_ERROR, 
              message: user.message, 
              success: false
            })
          }
        })
      }
      res.json({ 
        code: CODE_SUCCESS, 
        message: '批量创建成功', 
        success: true
      })
    } else {
      res.json({
        code: CODE_ERROR,
        success: false,
        message: '无批量创建权限'
      })
    }
  }, false);
}

// 设置可以注册的邮箱后缀
function set_mail(req, res, next) {//
  validateFunction(req, res, next, (req, res, next) => {
    let { cookie,mail_list } = req.body;
    let id = req.signedCookies.user_id
    if(id == 1) {
      if(mail_list.length != 0) {
        insert__email_suffixes(mail_list)
        .then(result => {
          res.json({ 
            message: result.message, 
            success: result.success
          })
          if(result.success){
            haveList = true;
          }
        })
      } else {
        res.json({ 
          message: '邮箱列表为空', 
          success: false
        })
      }
    } else {
      res.json({
        code: CODE_ERROR,
        success: false,
        message: '无设置权限'
      })
    }
  }, false);
}

// 移除管理员
function unmanage(req, res, next) {//
  validateFunction(req, res, next, (req, res, next) => {
    let { cookie, user_id} = req.body;
    let id = req.signedCookies.user_id
    if(id == 1) {
      select_user_by_id(user_id)
      .then(normalObj => {
        if(normalObj.success) {
          if(normalObj.character > 1) {
            res.json({ 
              code: CODE_SUCCESS, 
              success: true,
              message: '设置成功'
            })
          } else if(normalObj.character != 0) {
            update_user(user_id,'user_role',3)
            .then(norObj => {
              res.json({ 
                success: norObj.success,
                message: norObj.message
              })
            })
          } else {
            res.json({ 
              code: CODE_ERROR, 
              success: false,
              message: 'root用户不可设置'
            })
          }
        } else {
          res.json({
            code: CODE_ERROR,
            success: false,
            message: normalObj.message
          })
        }
      });
    } else {
      res.json({
        code: CODE_ERROR,
        success: false,
        message: '无移除管理员权限'
      })
    }
  }, false);
}

// 设置管理员
function manage(req, res, next) {//
  validateFunction(req, res, next, (req, res, next) => {
    let { cookie, user_id} = req.body;
    let id = req.signedCookies.user_id
    if(id == 1) {
      select_user_by_id(user_id)
      .then(normalObj => {
        if(normalObj.success) {
          if(normalObj.character == 1) {
            res.json({ 
              code: CODE_SUCCESS, 
              success: true,
              message: '设置成功'
            })
          } else if(normalObj.character > 1) {
            update_user(user_id,'user_role',1)
            .then(norObj => {
              res.json({ 
                success: norObj.success,
                message: norObj.message
              })
            })
          } else {
            res.json({ 
              code: CODE_ERROR, 
              success: false,
              message: 'root用户不可设置'
            })
          }
        } else {
          res.json({
            code: CODE_ERROR,
            success: false,
            message: normalObj.message
          })
        }
      });
    } else {
      res.json({
        code: CODE_ERROR,
        success: false,
        message: '无设置管理员权限'
      })
    }
  }, false);
}

// 移除受信用户
function untrust(req, res, next) {//
  validateFunction(req, res, next, (req, res, next) => {
    let { cookie, user_id} = req.body;
    let id = req.signedCookies.user_id;
    select_user_by_id(id)
    .then(usr => {
      if(usr.success)
      {
        if(usr.character > 1)
        {
          res.json({ 
            success: true,
            message: '无设置权限'
          })
          return;
        }
      } else {
        res.json({ 
          success: false,
          message: usr.message
        })
        return;
      }
    });
    select_user_by_id(user_id)
    .then(normalObj => {
      if(normalObj.success) {
        if(normalObj.character == 3) {
          res.json({ 
            code: CODE_SUCCESS, 
            success: true,
            message: '设置成功'
          })
        } else if(normalObj.character == 2) {
          update_user(user_id,'user_role',3)
          .then(norObj => {
            res.json({ 
              success: norObj.success,
              message: norObj.message
            })
          })
        } else {
          res.json({ 
            code: CODE_ERROR, 
            success: false,
            message: '该用户非受信用户'
          })
        }
      } else {
        res.json({
          code: CODE_ERROR,
          success: false,
          message: normalObj.message
        });
      }
    });
  }, false);
}

// 设置受信用户
function trust(req, res, next) {//
  validateFunction(req, res, next, (req, res, next) => {
    let { cookie, user_id} = req.body;
    let id = req.signedCookies.user_id;
    select_user_by_id(id)
    .then(usr => {
      if(usr.success)
      {
        if(usr.character > 1)
        {
          res.json({ 
            success: true,
            message: '无设置权限'
          })
          return;
        }
      } else {
        res.json({ 
          success: false,
          message: usr.message
        })
        return;
      }
    });
    select_user_by_id(user_id)
    .then(normalObj => {
      if(normalObj.success) {
        if(normalObj.character == 2) {
          res.json({ 
            code: CODE_SUCCESS, 
            success: true,
            message: '设置成功'
          })
        } else if(normalObj.character == 3) {
          update_user(user_id,'user_role',2)
          .then(norObj => {
            res.json({ 
              success: norObj.success,
              message: norObj.message
            })
          })
        } else {
          res.json({ 
            code: CODE_ERROR, 
            success: false,
            message: '该用户非普通用户'
          })
        }
      } else {
        res.json({
          code: CODE_ERROR,
          success: false,
          message: normalObj.message
        });
      }
    });
  }, false);
}

// 解除封禁
function unban(req, res, next) {//
  validateFunction(req, res, next, (req, res, next) => {
    let { cookie, user_id} = req.body;
    let id = req.signedCookies.user_id;
    select_user_by_id(id)
    .then(usr => {
      if(usr.success)
      {
        if(usr.character > 1)
        {
          res.json({ 
            success: true,
            message: '无设置权限'
          })
          return;
        }
      } else {
        res.json({ 
          success: false,
          message: usr.message
        })
        return;
      }
    });
    select_user_by_id(user_id)
    .then(normalObj => {
      if(normalObj.success) {
        if(normalObj.character < 4) {
          res.json({ 
            code: CODE_SUCCESS, 
            success: true,
            message: '设置成功'
          })
        } else {
          update_user(user_id,'user_role',3)
          .then(norObj => {
            res.json({ 
              success: norObj.success,
              message: norObj.message
            })
          })
        }
      } else {
        res.json({
          code: CODE_ERROR,
          success: false,
          message: normalObj.message
        });
      }
    });
  }, false);
}

// 封禁用户
function ban(req, res, next) {//
  validateFunction(req, res, next, (req, res, next) => {
    let { cookie, user_id} = req.body;
    let id = req.signedCookies.user_id;
    let cht = 1;
    select_user_by_id(id)
    .then(usr => {
      if(usr.success)
      {
        cht = usr.character
        if(usr.character > 1)
        {
          res.json({ 
            success: true,
            message: '无设置权限'
          })
          return;
        }
      } else {
        res.json({ 
          success: false,
          message: usr.message
        })
        return;
      }
    });
    select_user_by_id(user_id)
    .then(normalObj => {
      if(normalObj.success) {
        if(normalObj.character == 4) {
          res.json({ 
            code: CODE_SUCCESS, 
            success: true,
            message: '设置成功'
          })
        } else if(cht < normalObj.character) {
          update_user(user_id,'user_role',4)
          .then(norObj => {
            res.json({ 
              success: norObj.success,
              message: norObj.message
            })
          })
        } else {
          res.json({ 
            code: CODE_ERROR, 
            success: false,
            message: '无设置权限'
          })
        }
      } else {
        res.json({
          code: CODE_ERROR,
          success: false,
          message: normalObj.message
        });
      }
    });
  }, false);
}

function createSixNum() {
  var Num = "";
  for (var i = 0; i < 6; i++) {
      Num += Math.floor(Math.random() * 10);
  }
  return Num;
}

module.exports = {
  get_allow_register,
  user_info,
  user_list,
  mail_suffux_list,
  mail_changetime,
  username_changetime,
  login,
  logout,
  allow_register,
  register,
  prepare_mailcode,
  verify_mailcode,
  change_username,
  change_password,
  change_signature,
  change_email,
  reset_password,
  generate_user,
  set_mail,
  unmanage,
  manage,
  untrust,
  trust,
  unban,
  ban
}
