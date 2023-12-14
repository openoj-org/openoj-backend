
const { querySql, queryOne, modifysql } = require('../utils/index');
const md5 = require('../utils/md5');
const boom = require('boom');
const { body, validationResult, Result } = require('express-validator');
const { 
  CODE_ERROR,
  CODE_SUCCESS
} = require('../utils/constant');
// const {  } = require('../CURDs/problemCURD');
// const { error } = require('console');
// const { setCookie } = require('undici-types');
// const { user } = require('../db/dbConfig');
var multiparty = require('multiparty');
const { select_user_id_by_cookie, select_user_by_id } = require('../CURDs/userCURD');
const fs = require('fs');
const compressing = require('compressing');
const xlsx = require('xlsx');

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
// 获取题目样例文件
function problem_samples(req, res, next) {
  // validateFunction(req, res, next, (req, res, next) => {
  //   // TODO
  // }, false);
}

// 获取题目列表
function problem_list(req, res, next) {
  res.json({
    "success": true,
    "message": "未知错误",
    "result": [{
        "id": "U9riowjk",
        "title": "归程",
        "source": "NOI2018",
        "submit": 1088,
        "pass": 0.618,
        "score": 70,
        "grade": 3.465,
        "tags": ["树状数组", "贪心", "思维"]
    }],
    "count": 100
  });
  // validateFunction(req, res, next, (req, res, next) => {
  //   // TODO
  // }, false);
  /*await select_problem_list */
}

// 获取题目信息
function problem_info(req, res, next) {
  res.json({
    "success": true,
    "message": "id不合法",
    "title": "归程",
    "source": "NOI2018",
    "submit": 1088,
    "pass": 0.618,
    "score": 70,
    "grade": 3.465,
    "tags": ["树状数组", "贪心", "思维"],
    "titleEn": "return",
    "type": 0,
    "timeLimit": 1000,
    "memoryLimit": 512,
    "background": "有一天你时空穿越了...",
    "statement": "*欢迎*来到**编程世界**。这是一道~~模板题目~~，请你输出`Hello, world!`。",
    "inputStatement": "本题没有输入，但是可以测试公式$\\frac{1}{2}$，还有$f(x)=\\sum_{k\\geq 0}\\frac{f^{(k)}(x_0)}{k!}(x-x_0)^k$。",
    "outputStatement": "输出一行`Hello, world!`。",
    "rangeAndHint": "本题没有数据范围。但是，我们还是可以测试一下如果描述变得很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长，那么会怎么分行？",
    "samples": [{
        "display": true,
        "input": "1 2",
        "output": "3"
    }]
  });
  // validateFunction(req, res, next, (req, res, next) => {
  //   // TODO
  // }, false);
}

// 删除题目
function problem_delete(req, res, next) {
  // validateFunction(req, res, next, (req, res, next) => {
  //   // TODO
  // }, false);
}

// 用文件修改题目
function problem_change_by_file(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let form = new multiparty.Form({ uploadDir: './static' });
    return form.parse(req, async (err, fields, files) => {
      if (err) {
        res.json({
          success: false,
          message: err
        });
      } else {
        let { cookie, id} = fields;
        // select_user_id_by_cookie(cookie)
        // .then(usrid => {
        //   if(usrid.success) {
        //     select_user_by_id(usrid.id)
        //     .then(usr => {
        //       if(usr.success) {
        //         if(usr.character >1) {
        //           res.json({
        //             success: false,
        //             message: '无管理权限'
        //           });
        //         } else {
                  let file = files.data[0];
                  let filename = "./static/官方题库/"+id;
                  compressing.zip.uncompress(file.path, filename)
                  .then(() => {
                      console.log('success');
                      fs.unlinkSync(file.path);
                      //TODO 解析data文件
                  })
                  .catch(err => {
                      console.error(err);
                  });
        //         }
        //       } else {
        //         res.json({
        //           success: false,
        //           message: usr.message
        //         });
        //       }
        //     })
        //     .catch(errorObj => {
        //       res.json(errorObj);
        //     });
        //   } else {
        //     res.json({
        //       success: false,
        //       message: usrid.message
        //     });
        //   }
        // })
        // .catch(errorObj => {
        //   res.json(errorObj);
        // });
      }
    });
  }, false);
}

// 修改题目数据
function problem_change_data(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let form = new multiparty.Form({ uploadDir: './static' });
    return form.parse(req, async (err, fields, files) => {
      if (err) {
        res.json({
          success: false,
          message: err
        });
      } else {
        let { cookie, id} = fields;
        // select_user_id_by_cookie(cookie)
        // .then(usrid => {
        //   if(usrid.success) {
        //     select_user_by_id(usrid.id)
        //     .then(usr => {
        //       if(usr.success) {
        //         if(usr.character >1) {
        //           res.json({
        //             success: false,
        //             message: '无管理权限'
        //           });
        //         } else {
                  let file = files.data[0];
                  let filename = "./static/官方题库/"+id;
                  compressing.zip.uncompress(file.path, filename)
                  .then(() => {
                      console.log('success');
                      fs.unlinkSync(file.path);
                      //TODO 解析data文件
                  })
                  .catch(err => {
                      console.error(err);
                  });
        //         }
        //       } else {
        //         res.json({
        //           success: false,
        //           message: usr.message
        //         });
        //       }
        //     })
        //     .catch(errorObj => {
        //       res.json(errorObj);
        //     });
        //   } else {
        //     res.json({
        //       success: false,
        //       message: usrid.message
        //     });
        //   }
        // })
        // .catch(errorObj => {
        //   res.json(errorObj);
        // });
      }
    });
  }, false);
}

// 修改题目元数据
function problem_change_meta(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let { cookie, id, title, titleEn, type, timeLimit, memoryLimit, background, statement, inputStatement, outputStatement, rangeAndHint, source} = req.body;
    // select_user_id_by_cookie(cookie)
    // .then(usrid => {
    //   if(usrid.success) {
    //     select_user_by_id(usrid.id)
    //     .then(usr => {
    //       if(usr.success) {
    //         if(usr.character >1) {
    //           res.json({
    //             success: false,
    //             message: '无管理权限'
    //           });
    //         } else {
    //            //TODO:向数据库中修改数据 update_problems()
    //            .then(result => {})
    //            .catch()
    //         }
    //       } else {
    //         res.json({
    //           success: false,
    //           message: usr.message
    //         });
    //       }
    //     })
    //     .catch(errorObj => {
    //       res.json(errorObj);
    //     });
    //   } else {
    //     res.json({
    //       success: false,
    //       message: usrid.message
    //     });
    //   }
    // })
    // .catch(errorObj => {
    //   res.json(errorObj);
    // });
  }, false);
}

// 用文件创建题目
function problem_create_by_file(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let form = new multiparty.Form({ uploadDir: './static' });
    return form.parse(req, async (err, fields, files) => {
      if (err) {
        res.json({
          success: false,
          message: err
        });
      } else {
        let { cookie, id} = fields;
        let auth = authentication(cookie);
        if(auth.success) {
                  //TODO 将以上信息存入数据库
                  let file = files.data[0];
                  let filename = "./static/官方题库/"+id;
                  compressing.zip.uncompress(file.path, filename)
                  .then(() => {
                      console.log('success');
                      fs.unlinkSync(file.path);
                      
                  })
                  .catch(err => {
                      console.error(err);
                  });
        } else {
          res.json({
            success: false,
            message: auth.message
          })
        }
      }
    });
  }, false);
}

// 创建题目
function problem_create(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let form = new multiparty.Form({ uploadDir: './static' });
    return form.parse(req, async (err, fields, files) => {
      if (err) {
        res.json({
          success: false,
          message: err
        });
      } else {
        let { cookie, id, title, titleEn, type, timeLimit, memoryLimit, background, statement, inputStatement, outputStatement, rangeAndHint, source} = fields;
        let auth = authentication(cookie);
        if(auth.success) {
          insert_question( id.toString(), title, titleEn, type, timeLimit, memoryLimit, background, statement, inputStatement, outputStatement, rangeAndHint, source)
          .then(normalObj => {
            if(normalObj.success) {
              let file = files.data[0];
              let filename = "./static/官方题库/"+id;
              compressing.zip.uncompress(file.path, filename)
              .then(() => {
                  fs.unlinkSync(file.path);
                  let { arry, row, col} = decodeXlsx(filename+"/data/config.xlsx");
                  let norObj = InsertSamples(arry,5,row,id);
                  if(norObj.success) {
                    res.json({
                      success: true,
                      message: '题目创建成功'
                    })
                  } else {
                    res.json({
                      success: false,
                      message: norObj.message
                    })
                  }
              })
              .catch(err => {
                fs.unlinkSync(file.path);
                res.json(err);
              });
            } else {
              res.json({
                success: false,
                message: normalObj.message
              });
            }
          })
          .catch(errorObj => {
            res.json(errorObj);
          })
        } else {
          res.json({
            success: false,
            message: auth.message
          })
        }
      }
    });
  }, false);
}

function InsertSamples(arry,i,n,problemid) {
  if( i == n ) {
    return {
      success: true,
      message: '样例更新成功'
    };
  } else {
    let samplesid = createSessionId();
    // arry[i][0] : 子任务编号
    // arry[i][1] : 测试点编号
    // arry[i][2] : 输入文件名
    // arry[i][3] : 输出文件名   
    // arry[i][5] : 样例属性
    return insert_samples(samplesid, problemid, arry[i][5], arry[i][0], arry[i][1], arry[i][2], arry[i][3])
    .then(result => {
      if(result.success) {
        return InsertSamples(arry,i+1,n,problemid);
      } else {
        return {
          message: result.message,
          success: false
        };
      }
    })
    .catch(errorObj =>{
      return {
        message: errorObj.message, 
        success: false
      };
    });
  }
};

function createSessionId() {
  var formatedUUID = uuidv1();
  console.log(formatedUUID)
  return formatedUUID;
}

function authentication(cookie) {
  return select_user_id_by_cookie(cookie)
  .then(usrid => {
    if(usrid.success) {
      select_user_by_id(usrid.id)
      .then(usr => {
        if(usr.success) {
          if(usr.character >1) {
            return {
              success: false,
              message: '无管理权限'
            }
          } else {
            return {
              success: true,
              message: '验证成功'
            }
          }
        } else {
          return {
            success: false,
            message: usr.message
          }
        }
      })
      .catch(errorObj => {
        return {
          success: false,
          message: errorObj.message
        }
      });
    } else {
      return {
        success: false,
        message: usrid.message
      }
    }
  })
  .catch(errorObj => {
    return {
      success: false,
      message: errorObj.message
    }
  });
}

function decodeXlsx(xlsxpath){
  let ret = new Array();
  let workbook = xlsx.readFile(xlsxpath);
  let sheetNames = workbook.SheetNames;
  let sheet1 = workbook.Sheets[sheetNames[0]];
  let range = xlsx.utils.decode_range(sheet1['!ref']);
  let i = 0 ;
  let j = 0 ;
  for (let R = range.s.r; R <= range.e.r; ++R , ++i) {
      ret[i] = new Array();
      for (let C = range.s.c; C <= range.e.c; ++C , ++j) {
          let cell = xlsx.utils.encode_cell({c: C, r: R});
          if (sheet1[cell]) {
          ret[i][j] = sheet1[cell].v;
          }
      }
  }
  return {
    arry: ret,
    row: i,
    col: j
  }
}

module.exports = {
  problem_samples,
  problem_list,
  problem_info,
  problem_delete,
  problem_change_by_file,
  problem_change_data,
  problem_change_meta,
  problem_create,
  problem_create_by_file
}
