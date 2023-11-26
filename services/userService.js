
const { querySql, queryOne, modifysql } = require('../utils/index');
const md5 = require('../utils/md5');
const jwt = require('jsonwebtoken');
const boom = require('boom');
const { body, validationResult } = require('express-validator');
const { 
  CODE_ERROR,
  CODE_SUCCESS, 
  PRIVATE_KEY, 
  JWT_EXPIRED 
} = require('../utils/constant');
const { decode } = require('../utils/user-jwt');
const nodemail = require('../utils/nodemailer');
var allowregister = false; 
var haveList = false;
var fs = require("fs");

// 是否开放注册
function get_allow_register(req, res, next) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const [{ message }] = err.errors;
    next(boom.badRequest(message));
  } else {
    res.json({
      success: true,
      message: '查询成功',
      allow: allowregister
    })
  }
}

// 获取单个用户信息
function user_info(req, res, next) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const [{ message }] = err.errors;
    next(boom.badRequest(message));
  } else {
    let { user_id } = req.body;
    const query = `select * from users where user_id='${user_id}'`;
    querySql(query)
    .then(user => {
      if (!user || user.length === 0) {
        res.json({ 
          success: false,
        	message: '用户不存在', 
        	data: null 
        })
      } else {
        res.json({ 
          success: true,
        	message: '用户信息查询成功', 
          username: user[0].user_name,
          character: user[0].user_role,
          signature: user[0].user_signature,
          registerTime: user[0].user_register_time,
          pass: user[0].user_pass,
          mail: user[0].user_email
        })
      }
    })
  }
}

// 获取用户列表
function user_list(req, res, next) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const [{ message }] = err.errors;
    next(boom.badRequest(message));
  } else {
    const query = `select * from users`;
    querySql(query)
    .then(user => {
      if (!user || user.length === 0) {
        res.json({ 
          success: false,
        	message: '暂无用户', 
        	data: null 
        })
      } else {
        res.json({ 
          success: true,
        	message: '用户列表返回成功', 
          count: user.length,
          result: user,
        })
      }
    })
  }
}

// 获取可以注册的邮箱后缀列表
function mail_suffux_list(req, res, next) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const [{ message }] = err.errors;
    next(boom.badRequest(message));
  } else {
    var data = '';
    var readerStream = fs.createReadStream('mail_suffix_list.txt');
    readerStream.setEncoding('UTF8');
    readerStream.on('data', function(chunk) {
      data += chunk;
    });
    readerStream.on('end',function(){
      //console.log(data);
      res.json({ 
        success: true,
        message: '邮箱后缀获取成功',
        haveList: haveList,
        suffixList: data,
      })
    });
    readerStream.on('error', function(err){
      console.log(err.stack);
      res.json({ 
        success: false,
        message: '邮箱后缀获取失败', 
        data: null,
      })
    });
  }
}

// 获取邮箱修改的时间限制
function mail_changetime(req, res, next) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const [{ message }] = err.errors;
    next(boom.badRequest(message));
  } else {
    let { user_id } = req.body;
    const query = `select * from users where user_id='${user_id}'`;
    querySql(query)
    .then(user => {
      if (!user || user.length === 0) {
        res.json({ 
          code: CODE_ERROR,
          success: false,
        	message: '用户不存在', 
        	data: null 
        })
      } else {
        let NowTime = new Date().getTime();
        res.json({ 
          code: CODE_SUCCESS,
          success: true,
        	message: '查询成功', 
          time: 1000*60*60*24*365-NowTime+user[0].user_email_changetime
        })
      }
    })
  }
}

// 获取用户名修改的时间限制
function username_changetime(req, res, next) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const [{ message }] = err.errors;
    next(boom.badRequest(message));
  } else {
    let { user_id } = req.body;
    const query = `select * from users where user_id='${user_id}'`;
    querySql(query)
    .then(user => {
      if (!user || user.length === 0) {
        res.json({ 
          code: CODE_ERROR,
          success: false,
        	message: '用户不存在', 
        	data: null 
        })
      } else {
        let NowTime = new Date().getTime();
        res.json({ 
          code: CODE_SUCCESS,
          success: true,
        	message: '查询成功', 
          time: 1000*60*60*24*14-NowTime+user[0].user_name_changetime
        })
      }
    })
  }
}

// 用户登录
function login(req, res, next) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const [{ message }] = err.errors; 
    next(boom.badRequest(message));
  } else {
    let { usernameOrMail, password } = req.body;
    const query = `select * from users where user_name='${usernameOrMail}' or user_email='${usernameOrMail}'`;
    querySql(query)
    .then(user => {
    	// console.log('用户登录===', user);
      if (!user || user.length === 0) {
        res.json({ 
        	code: CODE_ERROR, 
          success: false,
        	message: '用户名或密码错误', 
        	data: null 
        })
      } else if(password != user[0].user_password_hash) {
        res.json({ 
        	code: CODE_ERROR, 
          success: false,
        	message: '用户名或密码错误', 
        	data: null 
        })
      } else {
        id = user[0].user_id
        const token = jwt.sign(
          { id },
          PRIVATE_KEY,
          { expiresIn: JWT_EXPIRED }
        )

        res.json({ 
        	code: CODE_SUCCESS, 
          success: true,
        	message: '登录成功', 
          cookie: user[0].user_id,
          id: user[0].user_id,
          username: user[0].user_name,
          useremail: user[0].user_email,
          character: user[0].user_role,
          signature: user[0].user_signature,
          registertime: user[0].user_register_time,
          token,
        })
      }
    })
  }
}

// 退出登录
function logout(req, res, next) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const [{ message }] = err.errors; 
    next(boom.badRequest(message));
  } else {
    res.json({ 
      code: CODE_SUCCESS, 
      success: true,
      message: '退出登录成功', 
      data: { 
        cookie: '',
        id: -1,
        username: null,
        useremail: null,
        character: null,
        signature: null,
        registertime: null
      } 
    })
  }
}

// 设置是否开放注册
function allow_register(req, res, next) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const [{ message }] = err.errors;
    next(boom.badRequest(message));
  } else {
    let { cookie, allow } = req.body;
    if(cookie === 1) {
      allowregister = allow;
      res.json({
        code: CODE_SUCCESS,
        success: true,
        message: '设置成功'
      })
    } else {
      res.json({
        code: CODE_ERROR,
        success: false,
        message: '无设置权限'
      })
    }
  }
}

// 用户注册
function register(req, res, next) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const [{ message }] = err.errors;
    next(boom.badRequest(message));
  } else {
    let { sessionId, username, passwordHash, signature} = req.body;
    const queryMailcode = `select * from mailcodes where mailcode_id='${sessionId}'`;
    querySql(queryMailcode)
    .then(result => {
      if (!result || result.length === 0) {
        res.json({ 
          code: CODE_ERROR, 
          success: false,
          message: '验证码失效'
        })
      } else {
        let user_email = result[0].mailcode_mail;
        const queryUser = `select * from users where user_name='${username}' or user_email='${user_email}'`;
        querySql(queryUser)
        .then(data => {
          if (data) {
            res.json({ 
              code: CODE_ERROR, 
              message: '用户名或邮箱已存在', 
              success: false
            })
          } else {
            let NowTime = new Date().getTime();
            const query = `insert into users(user_name, user_password_hash, user_email, user_role, user_signature, user_register_time, user_pass, user_name_changetime, user_email_changetime) values('${username}', '${passwordHash}', '${user_email}', '${3}', '${signature}', '${NowTime}', '${0}', '${NowTime}', '${NowTime}')`;
            querySql(query)
            .then(user => {
              if (!user || user.length === 0) {
                res.json({ 
                  code: CODE_ERROR, 
                  message: '注册失败', 
                  success: false
                })
              } else {
                const token = jwt.sign(
                  { username },
                  PRIVATE_KEY,
                  { expiresIn: JWT_EXPIRED }
                )
                res.json({ 
                  code: CODE_SUCCESS, 
                  message: '注册成功', 
                  success: true,
                  id: user[0].user_id,
                  cookie: user[0].user_id,
                  token
                })
              }
            })
          }
        })
      }
    })
  }
}

// 向邮箱发送验证码
function prepare_mailcode(req, res, next) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const [{ message }] = err.errors; 
    next(boom.badRequest(message));
  } else {
    let { user_email } = req.body;
    var code = createSixNum();
    time = new Date().getTime()
    var mail = {
      from: '<zxbzxb20@163.com>',
      subject: '接受凭证',
      to: user_email,
      text: '用' + code + '作为你的验证码'//发送验证码
    };
    Initcode = code
    nodemail(mail)
    const query = `insert into mailcodes(mailcode_code, mailcode_mail) values('${code}', '${user_email}')`;
    querySql(query)
    .then(result => {
      if (!result || result.length === 0) {
        res.json({ 
          code: CODE_ERROR, 
          message: '验证码失效', 
          data: null 
        })
      } else {
        res.json({ 
          code: CODE_SUCCESS, 
          message: '验证码已发送', 
          sessionId: result[0].mailcode_id
        })
      }
    })
  }
}

// 验证验证码是否正确
function verify_mailcode(req, res, next) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const [{ message }] = err.errors; 
    next(boom.badRequest(message));
  } else {
    let { mailcode_id,mailcode_code } = req.body;
    const queryMailcode = `select * from mailcodes where mailcode_id='${mailcode_id}'`;
    querySql(queryMailcode)
    .then(result => {
      if (!result || result.length === 0) {
        res.json({ 
          code: CODE_ERROR, 
          success: false,
          message: '验证码不存在'
        })
      } else {
        if(mailcode_code == result[0].mailcode_code)
        {
          res.json({ 
            code: CODE_SUCCESS, 
            success: true,
            message: '验证通过', 
            sessionId: result[0].mailcode_id
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
  }
}

// 修改用户名
function change_username(req, res, next) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const [{ message }] = err.errors; 
    next(boom.badRequest(message));
  } else {
    let { cookie, username} = req.body;
    const query = `select * from users where user_id='${cookie}'`;
    querySql(query)
    .then(result => {
      if (!result || result.length === 0) {
        res.json({ 
          code: CODE_ERROR, 
          success: false,
          message: 'cookie失效'
        })
      } else {
        let NowTime = new Date().getTime();
        const modSql = `UPDATE users SET user_name = '${username}',user_name_changetime = '${NowTime}' WHERE user_id='${cookie}'`;
        querySql(modSql)
        .then(user => {
          if (!user || user.length === 0) {
            res.json({ 
              code: CODE_ERROR, 
              success: false,
              message: '修改失败'
            })
          } else {
            res.json({ 
              code: CODE_SUCCESS, 
              success: true,
              message: '修改成功'
            })
          }
        })
      }
    })
  }
}

// 修改密码
function change_password(req, res, next) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const [{ message }] = err.errors; 
    next(boom.badRequest(message));
  } else {
    let { cookie, passwordHash} = req.body;
    const query = `select * from users where user_id='${cookie}'`;
    querySql(query)
    .then(result => {
      if (!result || result.length === 0) {
        res.json({ 
          code: CODE_ERROR, 
          success: false,
          message: 'cookie失效'
        })
      } else {
        const modSql = `UPDATE users SET user_password_hash = '${passwordHash}' WHERE user_id='${cookie}'`;
        querySql(modSql)
        .then(user => {
          if (!user || user.length === 0) {
            res.json({ 
              code: CODE_ERROR, 
              success: false,
              message: '修改失败'
            })
          } else {
            res.json({ 
              code: CODE_SUCCESS, 
              success: true,
              message: '修改成功'
            })
          }
        })
      }
    })
  }
}

// 修改签名
function change_signature(req, res, next) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const [{ message }] = err.errors; 
    next(boom.badRequest(message));
  } else {
    let { cookie, signature} = req.body;
    const query = `select * from users where user_id='${cookie}'`;
    querySql(query)
    .then(result => {
      if (!result || result.length === 0) {
        res.json({ 
          code: CODE_ERROR, 
          success: false,
          message: 'cookie失效'
        })
      } else {
        const modSql = `UPDATE users SET user_signature = '${signature}' WHERE user_id='${cookie}'`;
        querySql(modSql)
        .then(user => {
          if (!user || user.length === 0) {
            res.json({ 
              code: CODE_ERROR, 
              success: false,
              message: '修改失败'
            })
          } else {
            res.json({ 
              code: CODE_SUCCESS, 
              success: true,
              message: '修改成功'
            })
          }
        })
      }
    })
  }
}

// 修改邮箱]
function change_email(req, res, next) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const [{ message }] = err.errors; 
    next(boom.badRequest(message));
  } else {
    let { cookie, sessionId} = req.body;
    const query = `select * from users where user_id='${cookie}'`;
    querySql(query)
    .then(result => {
      if (!result || result.length === 0) {
        res.json({ 
          code: CODE_ERROR, 
          success: false,
          message: 'cookie失效'
        })
      } else {
        const query = `select * from mailcodes where mailcode_id='${sessionId}'`;
        querySql(query)
        .then(mailcode => {
          if (!mailcode || mailcode.length === 0) {
            res.json({ 
              code: CODE_ERROR, 
              success: false,
              message: '验证码失效'
            })
          } else {
            let NowTime = new Date().getTime();
            let user_email = mailcode[0].mailcode_mail;
            const modSql = `UPDATE users SET user_email = '${user_email}',user_email_changetime = '${NowTime}' WHERE user_id='${cookie}'`;
            querySql(modSql)
            .then(user => {
              if (!user || user.length === 0) {
                res.json({ 
                  code: CODE_ERROR, 
                  success: false,
                  message: '修改失败'
                })
              } else {
                res.json({ 
                  code: CODE_SUCCESS, 
                  success: true,
                  message: '修改成功'
                })
              }
            })
          }
        })
      }
    })
  }
}

// 忘记密码后重置
function reset_password(req, res, next) {
	const err = validationResult(req);
  if (!err.isEmpty()) {
    const [{ message }] = err.errors;
    next(boom.badRequest(message));
  } else {
    let { sessionId, newPassword } = req.body;
    const queryMailcode = `select * from mailcodes where mailcode_id='${sessionId}'`;
    querySql(queryMailcode)
    .then(result => {
      if (!result || result.length === 0) {
        res.json({ 
          code: CODE_ERROR, 
          success: false,
          message: '验证码失效'
        })
      } else {
        let user_email = result[0].mailcode_mail;
        const query = `select * from users where user_email='${user_email}'`;
        querySql(query)
        .then(user => {
          if (!user || usert.length === 0) {
            res.json({ 
              code: CODE_ERROR, 
              success: false,
              message: '邮箱未注册'
            })
          } else {
            const modSql = `UPDATE users SET user_password_hash = '${newPassword}' WHERE user_email='${user_email}'`;
            querySql(modSql)
            .then(user => {
              if (!user || user.length === 0) {
                res.json({ 
                  code: CODE_ERROR, 
                  success: false,
                  message: '修改失败'
                })
              } else {
                res.json({ 
                  code: CODE_SUCCESS, 
                  success: true,
                  message: '修改成功'
                })
              }
            })
          }
        })
      }
    })
  }
}
// 批量创建账号
function generate_user(req, res, next) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const [{ message }] = err.errors;
    next(boom.badRequest(message));
  } else {
    let { cookie, usernamePrefix, passwordHash, count} = req.body;
    if(cookie === 1) {
      for (var i = 0 ; i < count ; i++) {
        let user_name = usernamePrefix+i.toString();
        let NowTime = new Date().getTime();
        const query = `insert into users(user_name, user_password_hash, user_register_time, user_name_changetime, user_email_changetime) values('${user_name}', '${passwordHash}', '${NowTime}', '${NowTime}', '${NowTime}')`;
        querySql(query)
        .then(user => {
          if (!user || user.length === 0) {
            res.json({ 
              code: CODE_ERROR, 
              message: '批量创建失败', 
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
  }
}

// 设置可以注册的邮箱后缀
function set_mail(req, res, next) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const [{ message }] = err.errors;
    next(boom.badRequest(message));
  } else {
    let { mail_list } = req.body;
    var writerStream = fs.createWriteStream('mail_suffix_list.txt');
    writerStream.write(mail_list,'UTF8');
    writerStream.end();
    writerStream.on('finish', function() {
      //console.log("写入完成。");
      haveList = true;
      res.json({ 
        code: CODE_SUCCESS, 
        success: true,
        message: '邮箱后缀设置成功', 
        data: null,
      })
    });
    writerStream.on('error', function(err){
      console.log(err.stack);
      res.json({ 
        code: CODE_ERROR, 
        success: false,
        message: '邮箱后缀设置失败', 
        data: null,
      })
    });
  }
}

// 移除管理员
function unmanage(req, res, next) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const [{ message }] = err.errors; 
    next(boom.badRequest(message));
  } else {
    let { cookie, user_id} = req.body;
    if( cookie === 1 ) {
      const query = `select * from users where user_id='${user_id}'`;
      querySql(query)
      .then(result => {
        if (!result || result.length === 0) {
          res.json({ 
            code: CODE_ERROR, 
            success: false,
            message: '用户不存在'
          })
        } else {
          if(result[0].user_role > 1) {
            res.json({ 
              code: CODE_SUCCESS, 
              success: true,
              message: '设置成功'
            })
          } else if(result[0].user_role != 0) {
            const modSql = `UPDATE users SET user_role = '${3}' WHERE user_id='${user_id}'`;
            querySql(modSql)
            .then(user => {
              if (!user || user.length === 0) {
                res.json({ 
                  code: CODE_ERROR, 
                  success: false,
                  message: '设置失败'
                })
              } else {
                res.json({ 
                  code: CODE_SUCCESS, 
                  success: true,
                  message: '设置成功'
                })
              }
            })
          } else {
            res.json({ 
              code: CODE_ERROR, 
              success: false,
              message: 'root用户不可设置'
            })
          }
        }
      })
    } else {
      res.json({
        code: CODE_ERROR,
        success: false,
        message: '无移除管理员权限'
      })
    }
  }
}

// 设置管理员
function manage(req, res, next) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const [{ message }] = err.errors; 
    next(boom.badRequest(message));
  } else {
    let { cookie, user_id} = req.body;
    if( cookie === 1 ) {
      const query = `select * from users where user_id='${user_id}'`;
      querySql(query)
      .then(result => {
        if (!result || result.length === 0) {
          res.json({ 
            code: CODE_ERROR, 
            success: false,
            message: '用户不存在'
          })
        } else {
          if(result[0].user_role <= 1) {
            res.json({ 
              code: CODE_SUCCESS, 
              success: true,
              message: '设置成功'
            })
          } else {
            const modSql = `UPDATE users SET user_role = '${1}' WHERE user_id='${user_id}'`;
            querySql(modSql)
            .then(user => {
              if (!user || user.length === 0) {
                res.json({ 
                  code: CODE_ERROR, 
                  success: false,
                  message: '设置失败'
                })
              } else {
                res.json({ 
                  code: CODE_SUCCESS, 
                  success: true,
                  message: '设置成功'
                })
              }
            })
          }
        }
      })
    } else {
      res.json({
        code: CODE_ERROR,
        success: false,
        message: '无增加管理员权限'
      })
    }
  }
}

// 移除受信用户
function untrust(req, res, next) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const [{ message }] = err.errors; 
    next(boom.badRequest(message));
  } else {
    let { cookie, user_id} = req.body;
    const query1 = `select * from users where user_id='${cookie}'`;
      querySql(query1)
      .then(result => {
        if (!result || result.length === 0) {
          res.json({ 
            code: CODE_ERROR, 
            success: false,
            message: 'cookie失效'
          })
        } else {
          if(result[0])
        }
      })
    if( cookie === 1 ) {
      const query = `select * from users where user_id='${user_id}'`;
      querySql(query)
      .then(result => {
        if (!result || result.length === 0) {
          res.json({ 
            code: CODE_ERROR, 
            success: false,
            message: '用户不存在'
          })
        } else {
          if(result[0].user_role > 2) {
            res.json({ 
              code: CODE_SUCCESS, 
              success: true,
              message: '设置成功'
            })
          } else if(result[0].user_role === 2) {
            const modSql = `UPDATE users SET user_role = '${3}' WHERE user_id='${user_id}'`;
            querySql(modSql)
            .then(user => {
              if (!user || user.length === 0) {
                res.json({ 
                  code: CODE_ERROR, 
                  success: false,
                  message: '设置失败'
                })
              } else {
                res.json({ 
                  code: CODE_SUCCESS, 
                  success: true,
                  message: '设置成功'
                })
              }
            })
          } else {
            res.json({ 
              code: CODE_ERROR, 
              success: false,
              message: 'root用户不可设置'
            })
          }
        }
      })
    } else {
      res.json({
        code: CODE_ERROR,
        success: false,
        message: '无移除管理员权限'
      })
    }
  }
}

// 设置受信用户
router.post('/user/trust', resetPwdVaildator, service.reset_password);

// 解除封禁
router.post('/user/unban', resetPwdVaildator, service.reset_password);

// 封禁用户
router.post('/user/ban', resetPwdVaildator, service.reset_password);


// 校验用户名和密码
function validateUser(username, oldPassword) {
	const query = `select user_id, user_name from users where user_name='${username}' and user_password_hash='${oldPassword}'`;
  	return queryOne(query);
}

// 通过用户名查询用户信息
function findUser(username) {
  const query = `select user_id, user_name from users where user_name='${username}'`;
  return queryOne(query);
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
  login,
  register,
  reset_password
}
