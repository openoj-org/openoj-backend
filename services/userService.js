
// const { querySql, queryOne, modifysql } = require('../utils/index');
// const md5 = require('../utils/md5');
const boom = require('boom');
const { body, validationResult, cookie } = require('express-validator');
const {v1 : uuidv1} = require('uuid');
const { 
  CODE_ERROR,
  CODE_SUCCESS,
} = require('../utils/constant');
// const { decode } = require('../utils/user-jwt');
const nodemail = require('../utils/nodemailer');
const { select_user_by_id, select_users_by_param_order, select_user_by_name,
        select_full_user_by_email, select_full_user_by_id, select_full_user_by_name,
        insert_user, update_user, delete_user, select_email_suffixes, select_user_by_email, insert_cookie, delete_cookie, select_user_id_by_cookie,
        insert_email_suffixes, update_global_settings, select_global_settings } = require('../CURDs/userCURD');
const {
	update_mail_code_success_session_id,
	// 按 sessionId 查询邮箱验证码
	select_mail_code_by_session_id,
	// 按成功后的会话 id 查询邮箱验证码
	select_mail_code_by_success_session_id,
	// 按邮箱查询邮箱验证码
	select_mail_code_by_mail,
	// 插入邮箱验证码 (已经在后端生成)
	insert_mail_code,
	// 更新邮箱验证码
	update_mail_code,
	// 删除邮箱验证码
	delete_mail_code
} = require('../CURDs/mailCodeCURD');
const { errorMonitor } = require('nodemailer/lib/xoauth2');

// 检查器函数, func 为 CURD 函数, isDefault 表示是否使用默认 JSON 解析
function validateFunction(req, res, next, func, isDefault) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const [{ message }] = err.errors;
    next(boom.badRequest(message));
  } else {
    isDefault ? func(req, res, next)
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

// 是否开放注册, 已完成对接、测试
function get_allow_register(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    return select_global_settings()
    .then(normalObj => {
      res.json({
        success: normalObj.success,
        message: normalObj.message,
        allow: normalObj.success ? normalObj.allowRegister : undefined
      });
    })
  }, false);
}

// 获取单个用户信息, 已完成对接、测试
function user_info(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let { id } = req.query;
    return select_user_by_id(id)
    .then(normalObj => {
      // console.log(normalObj);
      let {success, message, username, character, signature, registerTime, pass, mail} = normalObj;
      res.json({success, message, username, character, signature, registerTime, pass, mail});
    });
  }, false);
}

// 获取用户列表, 已完成对接、测试
function user_list(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let { order, increase, usernameKeyword, start, end } = req.query;
    switch (order) {
      case 'id': {
        order = 'user_id';
        break;
      }
      case 'username': {
        order = 'user_name';
        break;
      }
      case 'character': {
        order = 'user_role';
        break;
      }
      case 'registerTime': {
        order = 'user_register_time';
        break;
      }
      default: {
        break;
      }
    }
    return select_users_by_param_order(order, increase, usernameKeyword, start, end);
  }, true);
}

// 获取可以注册的邮箱后缀列表, 已完成对接、测试
function mail_suffux_list(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    return select_email_suffixes()
    .then(normalObj => {
      select_global_settings()
      .then(setting => {
        res.json({
          haveList: setting.haveList,
          suffixList: setting.haveList ?
                      normalObj.suffixList :
                      undefined
        });
      })
      .catch(err => {
        res.json({
          success: false,
          message: err.message
        });
      })
    })
  }, false);
}

// 获取邮箱修改的时间限制, 已完成对接、测试
function mail_changetime(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let {cookie} = req.query;
    return select_user_id_by_cookie(cookie)
    .then(usrid => {
      if(usrid.success) {
        select_user_by_id(usrid.id)
        .then(normalObj => {
          if(normalObj.success) {
            res.json({
              success: true,
              message: '查询成功',
              time: Math.max(31356000000 - new Date().getTime() + normalObj.emailChangeTime, 0)
            });
          } else {
            res.json(normalObj);
          }
        })
        .catch(errObj => {
          res.json(errObj);
        });
      } else {
        res.json({
          success: false,
          message: usrid.message
        });
      }
    })
    .catch(errorObj =>{
      res.json(errorObj);
    });
  }, false);
}

// 获取用户名修改的时间限制, 已完成对接、测试
function username_changetime(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let {cookie} = req.query;
    return select_user_id_by_cookie(cookie)
    .then(usrid => {
      if(usrid.success) {
        select_user_by_id(usrid.id)
        .then(normalObj => {
          if(normalObj.success) {
            res.json({
              success: true,
              message: '查询成功',
              time: Math.max(1209600000 - new Date().getTime() + normalObj.nameChangeTime, 0)
            });
          } else {
            res.json(normalObj);
          }
        })
        .catch(errObj => {
          res.json(errObj);
        });
      } else {
        res.json({
          success: false,
          message: usrid.message
        });
      }
    })
    .catch(errorObj =>{
      res.json(errorObj);
    });
  }, false);
}

// 用户登录
function login(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let { usernameOrMail, passwordCode } = req.body;
    let userObj = null;
    return select_full_user_by_email(usernameOrMail)
    .then(usr => {
      if (usr.success) {
        userObj = {
          id: usr.userInfo.user_id,
          passwordHash: usr.userInfo.user_password_hash
        };
        if (userObj == null || userObj.passwordHash != passwordCode) {
          res.status(CODE_ERROR).json({
            success: false,
            message: '用户名或密码错误'
          });
        } else {
          select_full_user_by_id(userObj.id)
          .then(norObj => {
            if (norObj.success) {
              let cookienum = createSessionId();
              insert_cookie(userObj.id,cookienum)
              .then(result => {
                if(result.success) {
                  res.json({
                    success: true,
                    message: '登录成功',
                    username: norObj.userInfo.user_name,
                    character: norObj.userInfo.user_role,
                    id: userObj.id,
                    cookie: cookienum
                  })
                } else {
                  res.status(CODE_ERROR).json({
                    success: false,
                    message: result.message
                  });
                }
              });
            } else {
              res.status(CODE_ERROR).json({
                success: false,
                message: norObj.message
              });
            }
          })
          .catch(errorObj => {
            res.json(errorObj);
          });
        }
      } else {
        select_full_user_by_name(usernameOrMail)
        .then(usr1 => {
          if (usr1.success) {
            userObj = {
              id: usr1.userInfo.user_id,
              passwordHash: usr1.userInfo.user_password_hash
            };
          }
          if (userObj == null || userObj.passwordHash != passwordCode) {
            res.status(CODE_ERROR).json({
              success: false,
              message: '用户名或密码错误'
            });
          } else {
            select_full_user_by_id(userObj.id)
            .then(norObj => {
              if (norObj.success) {
                let cookienum = createSessionId();
                insert_cookie(userObj.id,cookienum)
                .then(result => {
                  if(result.success) {
                    res.json({
                      success: true,
                      message: '登录成功',
                      username: norObj.userInfo.user_name,
                      character: norObj.userInfo.user_role,
                      id: userObj.id,
                      cookie: cookienum
                    })
                  } else {
                    res.status(CODE_ERROR).json({
                      success: false,
                      message: result.message
                    });
                  }
                });
              } else {
                res.status(CODE_ERROR).json({
                  success: false,
                  message: norObj.message
                });
              }
            })
            .catch(errorObj => {
              res.json(errorObj);
            });
          }
        })
        .catch(errorObj => {
          res.json(errorObj);
        });
      }
    })
    .catch(errorObj => {
      res.json(errorObj);
    });
  });
}

// 退出登录, 已完成对接、测试
function logout(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let {cookie} = req.body;
    return delete_cookie(cookie)
    .then(result => {
      res.json(result);
    });
  }, false);
}

// 设置是否开放注册, 已完成对接、测试
function allow_register(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let { cookie, allow } = req.body;
    return select_user_id_by_cookie(cookie)
    .then(usr =>{
      if(usr.success) {
        let id = usr.id;
        select_user_by_id(id)
        .then(normalObj => {
          if(normalObj.success) {
            if(normalObj.character == 0) {
              update_global_settings('allow_register',allow)
              .then(result => {
                  res.json(result);
              })
              .catch(errorObj =>{
                res.status(CODE_ERROR).json(errorObj);
              });
            } else {
              res.status(CODE_ERROR).json({
                success: false,
                message: '无设置权限',
              });
            }
          } else {
            res.status(CODE_ERROR).json(normalObj);
          }
        });
      } else {
        res.json(usr);
      }
    });
  }, false);
}

// 用户注册
function register(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    return select_global_settings()
    .then(allowregister => {
      if(allowregister.success) {
        if(allowregister.allowRegister) {
          let { sessionId, username, passwordCode, signature} = req.body;
          if(username.length < 3 || username.length > 20 || signature.length > 100) {
            if(username.length < 3 || username.length > 20) {
              res.json({
                success: false,
                message: '用户名长度为[3,20]'
              });
            } else {
              res.json({
                success: false,
                message: '签名长度需小于100'
              });
            }
          } else {
            select_user_by_name(username)
            .then(normalObj => {
              if(normalObj.success) {
                res.status(CODE_ERROR).json({
                  success: false,
                  message: '用户名已存在'
                });
              } else {
                select_mail_code_by_success_session_id(sessionId)
                .then(normalObj => {
                  if(normalObj.success) {
                    let address = normalObj.mail;
                    if(normalObj.scene != 0) {
                      res.json({
                        success: false,
                        message: '验证码无效'
                      });
                    } else {
                      select_user_by_email(address)
                      .then(norObj => {
                        if(norObj.success) {
                          res.status(CODE_ERROR).json({
                            success: false,
                            message: '邮箱已注册'
                          });
                        } else {
                          insert_user(username,passwordCode,address,3,signature)
                          .then(result => {
                            if(result.success) {
                              let cookienum = createSessionId();
                              insert_cookie(result.id, cookienum)
                              .then(result2 => {
                                if(result2.success) {
                                  res.json({
                                    success: true,
                                    message: '注册成功',
                                    id: result.id,
                                    cookie: cookienum
                                  });
                                } else {
                                  res.json(result2);
                                }
                              })
                              .catch(errorObj => {
                                res.json(errorObj);
                              });
                            } else {
                              res.json({
                                success: false,
                                message: result.message
                              });
                            }
                          })
                          .catch(errorObj => {
                            res.json(errorObj);
                          });
                        }
                      })
                      .catch(errorObj => {
                        res.json(errorObj);
                      });
                    }
                  } else {
                    res.json({
                      success: false,
                      message: normalObj.message
                    });
                  }
                })
                .catch(errorObj => {
                  res.json(errorObj);
                });
              }
            })
            .catch(errorObj => {
              res.json(errorObj);
            });
          }
        } else {
          res.json({
            success: false,
            message: '未开放注册'
          });
        }
      } else {
        res.json({
          success: false,
          message: allowregister.message
        });
      }
    });
  }, false);
}

// 向邮箱发送验证码, 已完成对接、测试
function prepare_mailcode(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let { address, scene } = req.body;
    if(address.length > 50) {
      res.status(CODE_ERROR).json({
        success: false,
        message: '邮箱长度应小于 50'
      });
    }
    return select_user_by_email(address)
    .then(result => {
      if (!result.success) {
        var code = createSixNum();
        var mail = {
          from: '<zxbzxb20@163.com>',
          subject: '接受凭证',
          to: address,
          text: '用' + code + '作为你的验证码'//发送验证码
        };
        nodemail(mail)
        .then(result => {
          if(!result.success) {
            res.status(CODE_ERROR).json({
              success: false,
              message: result.message
            });
          } else {
            let sessionId = createSessionId();
            return insert_mail_code(sessionId, address, code, scene)
            .then(result => {
              if(result.success) {
                res.json({ 
                  code: CODE_SUCCESS, 
                  message: '验证码已发送', 
                  sessionId: sessionId
                })
              } else {
                res.status(CODE_ERROR).json({
                  success: false,
                  message: result.message
                });
              }
            })
            .catch(errorObj => {
              res.json(errorObj);
            });
          }
        })
        .catch(errorObj => {
          res.json(errorObj);
        });
      } else if (scene != 2) {
        res.status(CODE_ERROR).json({
          success: false,
          message: '邮箱已绑定'
        });
      } else {
        res.status(CODE_ERROR).json({
          success: false,
          message: '邮箱未注册'
        });
      }
    });
  }, false);
}

// 验证验证码是否正确, 已完成对接、测试
function verify_mailcode(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let { sessionId,code } = req.body;
    return select_mail_code_by_session_id(sessionId)
    .then(result => {
      if (!result.success) {
        res.status(CODE_ERROR).json({  
          success: false,
          message: '验证码不存在'
        })
      } else {
        if(code == result.code_number)
        {
          let sessionId2 = createSessionId();
          update_mail_code_success_session_id(sessionId,sessionId2)
          .then(norObj => {
            if(norObj.success){
              res.json({ 
                code: CODE_SUCCESS, 
                success: true,
                message: '验证通过', 
                sessionId: sessionId2
              })
            } else {
              res.json({ 
                success: false,
                message: norObj.message
              });
            }
          })
          .catch(errMsg =>{
            res.json(errMsg);
          });
        } else {
          res.status(CODE_ERROR).json({ 
            success: false,
            message: '验证码错误'
          });
        }
      }
    });
  }, false);
}

// 修改用户名, 已完成对接、测试
function change_username(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let { cookie, username } = req.body;
    return select_user_id_by_cookie(cookie)
    .then(usrid => {
      if(usrid.success) {
        let id = usrid.id;
        select_user_by_id(id)
        .then(normalObj => {
          if(normalObj.success) {
            if (normalObj.username === username) {
              res.status(403).json({
                success: false,
                message: '新用户名不能和旧用户名相同'
              });
            }
            update_user(id, 'user_name', username)
            .then(result => {
              res.json(result);
            })
            .catch(errorObj =>{
              res.status(CODE_ERROR).json(errorObj);
            });
          } else {
            res.status(CODE_ERROR).json(normalObj);
          }
        })
        .catch(errorObj => {
          res.json(errorObj);
        });
      } else {
        res.json(usrid);
      }
    });
  }, false);
}

// 修改密码, 已完成对接、测试
function change_password(req, res, next) {//
  validateFunction(req, res, next, (req, res, next) => {
    let { cookie, passwordCode } = req.body;
    return select_user_id_by_cookie(cookie)
    .then(usrid =>{
      // console.log(usrid);
      if(usrid.success) {
        let id = usrid.id;
        select_full_user_by_id(id)
        .then(norObj => {
          // console.log(normalObj);
          if(norObj.success) {
            let usr = norObj.userInfo;
            if (usr.user_password_hash === passwordCode) {
              res.status(403).json({
                success: false,
                message: '新密码不能和旧密码相同'
              });
            }
            update_user(id, 'user_password_hash', passwordCode)
            .then(result => {
              res.json(result);
            })
            .catch(errObj =>{
              res.json(errObj);
            });
          } else {
            res.json(norObj);
          }
        })
        .catch(errorObj =>{
          res.json(errorObj);
        });
      } else {
        res.json(usrid);
      }
    });
  }, false);
}

// 修改签名, 已完成对接、测试
function change_signature(req, res, next) {//
  validateFunction(req, res, next, (req, res, next) => {
    let { cookie, signature } = req.body;
    return select_user_id_by_cookie(cookie)
    .then(usrid => {
      if(usrid.success) {
        let id = usrid.id;
        select_user_by_id(id)
        .then(normalObj => {
          if(normalObj.success) {
            update_user(id, 'user_signature', signature)
            .then(result => {
              res.json(result);
            })
            .catch(errorObj =>{
              res.status(CODE_ERROR).json(errorObj);
            });
          } else {
            res.status(CODE_ERROR).json(normalObj);
          }
        })
        .catch(errorObj => {
          res.json(errorObj);
        });
      } else {
        res.json(usrid);
      }
    });
  }, false);
}

// 修改邮箱
function change_email(req, res, next) {//
  validateFunction(req, res, next, (req, res, next) => {
    let { cookie, sessionId } = req.body;
    return select_user_id_by_cookie(cookie)
    .then(usrid =>{
      if(usrid.success) {
        let id = usrid.id;
        select_user_by_id(id)
        .then(normalObj => {
          if(normalObj.success) {
            select_mail_code_by_success_session_id(sessionId)
            .then(norObj => {
              if(norObj.success) {
                if(norObj.scene != 1) {
                  res.json({
                    success: false,
                    message: '验证码非更换邮箱的验证码'
                  })
                } else {
                  update_user(id,'user_email',norObj.mail)
                  .then(result => {
                    res.json({
                      success: result.success,
                      message: result.message
                    })
                  })
                  .catch(errorObj =>{
                    res.json(errorObj);
                  });
                }
              } else {
                res.json({
                  code: CODE_ERROR,
                  success: false,
                  message: norObj.message
                })
              }
            })
            .catch(errorObj =>{
              res.json(errorObj);
            });
          } else {
            res.json({
              success: false,
              message: normalObj.message
            });
          }
        })
        .catch(errorObj =>{
          res.json(errorObj);
        });
      } else {
        res.json({
          success: false,
          message: usrid.message
        })
      }
    })
    .catch(errorObj =>{
      res.json(errorObj);
    });
  }, false);
}

// 忘记密码后重置
function reset_password(req, res, next) {//
  validateFunction(req, res, next, (req, res, next) => {
    let { sessionId, passwordCode } = req.body;
    return select_mail_code_by_success_session_id(sessionId)
    .then(normalObj => {
      if(normalObj.success) {
        if(normalObj.scene != 2){
          res.json({
            success: false,
            message: '验证码无效'
          })
        } else {
          select_full_user_by_email(normalObj.mail)
          .then(norObj => {
            if(norObj.success) {
              update_user(norObj.userInfo.user_id,'user_password_hash',passwordCode)
              .then(result => {
                res.json({
                  success: result.success,
                  message: result.message
                })
              })
              .catch(errorObj =>{
                res.json(errorObj);
              });
            } else {
              res.json({
                success: false,
                message: norObj.message
              })
            }
          })
          .catch(errorObj =>{
            res.json(errorObj);
          });
        }
      } else {
        res.json({
          success: false,
        	message: normalObj.message
        });
      }
    })
    .catch(errorObj =>{
      res.json(errorObj);
    })
  }, false);
}

// 批量创建账号
function generate_user(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let { cookie, usernamePrefix, passwordCode, count } = req.body;
    return select_user_id_by_cookie(cookie)
    .then(usrid =>{
      if(usrid.success) {
        let id = usrid.id;
        if(id == 1) {
          select_users_by_param_order(1,1,usernamePrefix)
          .then(result => {
            if(result.success) {
              let regexp = new RegExp("^" + usernamePrefix);
              for(var j = 0 ; j < result.count ; j++) {
                let usrname = result.result[j].username;
                usrname = usrname.replace(regexp,'');
                let num = parseInt(usrname);
                if(num.toString === usrname && 1 <= num && num <= count)
                {
                  res.json({
                    success: false,
                    message: "用户名" +result.result[j].username +"已被占用"
                  })
                }
              }
            }
            if(count <= 0) {
              res.json({
                success: false,
                message: "用户数量需大于0"
              })
              return;
            }
            let ret = InsertUsers(usernamePrefix,passwordCode,1,count);
            res.json({
              message: ret.message, 
              success: ret.success
            });
          })
          .catch(errorObj =>{
            res.json(errorObj);
          });
        } else {
          res.json({
            success: false,
            message: '无批量创建权限'
          })
        }
      } else {
        res.json({
          success: false,
          message: usrid.message
        })
      }
    })
    .catch(errorObj =>{
      res.json(errorObj);
    });
  }, false);
}

// 设置可以注册的邮箱后缀, 已完成对接、测试
function set_mail(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let { cookie,haveList,suffixList } = req.body;
    if (!haveList) {
      res.json({
        success: false,
        message: '当前不开放注册'
      })
    }
    return select_user_id_by_cookie(cookie)
    .then(usrid => {
      if(usrid.success) {
        let id = usrid.id;
        if(id == 1) {
          insert_email_suffixes(suffixList)
          .then(obj => {
            res.json(obj);
          })
          .catch(err => {
            res.json(err);
          });
        } else {
          res.status(CODE_ERROR).json({
            success: false,
            message: '无设置权限'
          })
        }
      } else {
        res.json(usrid);
      }
    });
  }, false);
}

// 移除管理员
function unmanage(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let { cookie, id } = req.body;
    return select_user_id_by_cookie(cookie)
    .then(usrid =>{
      if(usrid.success) {
        if(usrid.id == 1) {
          select_user_by_id(id)
          .then(normalObj => {
            // console.log(normalObj);
            if(normalObj.success) {
              if(normalObj.character != 1) {
                res.json({
                  success: false,
                  message: '该用户非管理员'
                });
              } else {
                update_user(id, 'user_role', 3)
                .then(norObj => {
                  res.json(norObj);
                })
                .catch(errorObj => {
                  res.json(errorObj);
                });
              }
            } else {
              res.json(normalObj);
            }
          })
          .catch(errorObj =>{
            res.json(errorObj);
          });
        } else {
          res.json({
            success: false,
            message: '无移除管理员权限'
          });
        }
      } else {
        res.json(usrid);
      }
    });
  }, false);
}

// 设置管理员
function manage(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let { cookie, id } = req.body;
    return select_user_id_by_cookie(cookie)
    .then(usrid =>{
      if(usrid.success) {
        if(usrid.id == 1) {
          select_user_by_id(id)
          .then(normalObj => {
            // console.log(normalObj);
            if(normalObj.success) {
              if(normalObj.character == 0) {
                res.json({
                  success: false,
                  message: 'root 用户不可设置'
                });
              } else {
                update_user(id, 'user_role', 1)
                .then(norObj => {
                  res.json(norObj);
                })
                .catch(errorObj => {
                  res.json(errorObj);
                });
              }
            } else {
              res.json(normalObj);
            }
          })
          .catch(errorObj =>{
            res.json(errorObj);
          });
        } else {
          res.json({
            success: false,
            message: '无设置管理员权限'
          });
        }
      } else {
        res.json(usrid);
      }
    });
  }, false);
}

// 移除受信用户
function untrust(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let { cookie, id } = req.body;
    return select_user_id_by_cookie(cookie)
    .then(usrid =>{
      if(usrid.success) {
        select_user_by_id(usrid.id)
        .then(usr => {
          if(usr.success)
          {
            if(usr.character > 1) {
              res.json({ 
                success: false,
                message: '无移除受信用户权限'
              });
            } else {
              select_user_by_id(id)
              .then(normalObj => {
                if(normalObj.success) {
                  if(normalObj.character != 2) {
                    res.json({ 
                      success: false,
                      message: '该用户非受信用户'
                    })
                  } else {
                    update_user(id, 'user_role', 3)
                    .then(norObj => {
                      res.json(norObj);
                    })
                    .catch(errorObj =>{
                      res.json(errorObj);
                    });
                  }
                } else {
                  res.json(normalObj);
                }
              });
            }
          } else {
            res.json(usr);
          }
        })
        .catch(errorObj =>{
          res.json(errorObj);
        });
      } else {
        res.json(usrid);
      }
    })
  }, false);
}

// 设置受信用户
function trust(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let { cookie, id } = req.body;
    return select_user_id_by_cookie(cookie)
    .then(usrid =>{
      if(usrid.success) {
        select_user_by_id(usrid.id)
        .then(usr => {
          if(usr.success)
          {
            if(usr.character > 1) {
              res.json({ 
                success: false,
                message: '无设置受信用户权限'
              });
            } else {
              select_user_by_id(id)
              .then(normalObj => {
                if(normalObj.success) {
                  if(normalObj.character != 3) {
                    res.json({ 
                      success: false,
                      message: '该用户非普通用户'
                    })
                  } else {
                    update_user(id, 'user_role', 2)
                    .then(norObj => {
                      res.json(norObj);
                    })
                    .catch(errorObj =>{
                      res.json(errorObj);
                    });
                  }
                } else {
                  res.json(normalObj);
                }
              });
            }
          } else {
            res.json(usr);
          }
        })
        .catch(errorObj =>{
          res.json(errorObj);
        });
      } else {
        res.json(usrid);
      }
    })
  }, false);
}

// 解除封禁
function unban(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let { cookie, id } = req.body;
    return select_user_id_by_cookie(cookie)
    .then(usrid =>{
      if(usrid.success) {
        select_user_by_id(usrid.id)
        .then(usr => {
          if(usr.success)
          {
            if(usr.character > 1) {
              res.json({ 
                success: false,
                message: '无解除封禁用户权限'
              });
            } else {
              select_user_by_id(id)
              .then(normalObj => {
                if(normalObj.success) {
                  if(normalObj.character != 4) {
                    res.json({ 
                      success: false,
                      message: '该用户非封禁用户'
                    })
                  } else {
                    update_user(id, 'user_role', 4)
                    .then(norObj => {
                      res.json(norObj);
                    })
                    .catch(errorObj =>{
                      res.json(errorObj);
                    });
                  }
                } else {
                  res.json(normalObj);
                }
              });
            }
          } else {
            res.json(usr);
          }
        })
        .catch(errorObj =>{
          res.json(errorObj);
        });
      } else {
        res.json(usrid);
      }
    })
  }, false);
}

// 封禁用户
function ban(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let { cookie, id } = req.body;
    return select_user_id_by_cookie(cookie)
    .then(usrid =>{
      if(usrid.success) {
        select_user_by_id(usrid.id)
        .then(usr => {
          if(usr.success)
          {
            if(usr.character > 1) {
              res.json({ 
                success: false,
                message: '无设置封禁用户权限'
              });
            } else {
              select_user_by_id(id)
              .then(normalObj => {
                if(normalObj.success) {
                  if(normalObj.character < 2) {
                    res.json({ 
                      success: false,
                      message: '该用户为管理员或 root, 不可封禁'
                    })
                  } else {
                    update_user(id, 'user_role', 4)
                    .then(norObj => {
                      res.json(norObj);
                    })
                    .catch(errorObj =>{
                      res.json(errorObj);
                    });
                  }
                } else {
                  res.json(normalObj);
                }
              });
            }
          } else {
            res.json(usr);
          }
        })
        .catch(errorObj =>{
          res.json(errorObj);
        });
      } else {
        res.json(usrid);
      }
    })
  }, false);
}

function createSixNum() {
  var Num = "";
  for (var i = 0; i < 6; i++) {
      Num += Math.floor(Math.random() * 10);
  }
  return Num;
}

function createSessionId() {
  var formatedUUID = uuidv1();
  console.log(formatedUUID)
  return formatedUUID;
}

function InsertUsers(usernamePrefix, passwordCode, i, count) {
  let user_name = usernamePrefix + i.toString();
  return insert_user(user_name,passwordCode,null,3,null)
  .then(user => {
    if (!user.success) {
      return {
        message: user.message, 
        success: false
      };
    } else {
      if( i >= count ) {
        return {
          message: '批量添加用户成功', 
          success: true
        };
      } else {
        return InsertUsers(usernamePrefix, passwordCode, i + 1, count);
      }
    }
  })
  .catch(errorObj =>{
    return {
      message: errorObj.message, 
      success: false
    };
  });
};

module.exports = {
  get_allow_register,
  user_info,
  user_list,
  mail_suffux_list,
  mail_changetime,
  username_changetime,
  login,               // x
  logout,
  allow_register,
  register,            // x
  prepare_mailcode,
  verify_mailcode,
  change_username,
  change_password,
  change_signature,
  change_email,        // x
  reset_password,      // x
  generate_user,       // x
  set_mail,
  unmanage,
  manage,
  untrust,
  trust,
  unban,
  ban
}
