
const { querySql, queryOne, modifysql } = require('../utils/index');
const md5 = require('../utils/md5');
const boom = require('boom');
const { body, validationResult } = require('express-validator');
const { 
  CODE_ERROR,
  CODE_SUCCESS,
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
  validateFunction(req, res, next, (req, res, next) => {
    // TODO
  }, false);
}

// 获取题目列表
function problem_list(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    // TODO
  }, false);
}

// 获取题目信息
function problem_info(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    // TODO
  }, false);
}

// 删除题目
function problem_delete(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    // TODO
  }, false);
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

function decodeXlsx(xlsxpath){
  let ret = new Array();
  let workbook = xlsx.readFile(xlsxpath);
  let sheetNames = workbook.SheetNames;
  let sheet1 = workbook.Sheets[sheetNames[0]];
  let range = xlsx.utils.decode_range(sheet1['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
      ret[R] = new Array();
      for (let C = range.s.c; C <= range.e.c; ++C) {
          let cell_address = {c: C, r: R};
          let cell = xlsx.utils.encode_cell(cell_address);
          if (sheet1[cell]) {
          ret[R][C] = sheet1[cell].v;
          }
      }
  }
  return ret;
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
