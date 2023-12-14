
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
const {v1 : uuidv1} = require('uuid');
const admZip = require('adm-zip');
const iconv    = require('iconv-lite');
const xlsx = require('xlsx');
const { error } = require('console');

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
  validateFunction(req, res, next, (req, res, next) => {
    let {id, evaluation, cookie} = req.body;
    select_problemInfo_by_id(id)
    .then(result =>{
      if(result.success) {
        
      } else {
        res.json({
          success: false,
          message: result.message
        })
      }
    })
    .catch(errorObj =>{
      res.json(errorObj);
    })
  }, false);
}

// 删除题目
function problem_delete(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let {cookie, id} = req.body;
    let auth = authentication(cookie);
    if(auth.success) {
      let fileStoragePath = "./static/官方题库/"+id;
      fs.unlinkSync(fileStoragePath);
      delete_samples_by_question_id(id.toString())
      .then(normalObj => {
        if(normalObj.success) {
          delete_question_by_id(id.toString())
          .then(norObj => {
            if(norObj.success) {
              res.json({
                success: true,
                message: '删除成功'
              })
            } else {
              res.json({
                success: false,
                message: norObj.message
              })
            }
          })
          .catch(errorObj => {
            res.json(errorObj);
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
      });
    } else {
      res.json({
        success: false,
        message: auth.message
      });
    }
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
        let auth = authentication(cookie);
        if(auth.success) {
          let file = files.data[0];
          let fileStoragePath = "./static/官方题库/"+id;
          fs.unlinkSync(fileStoragePath);
          unzip(file.path,fileStoragePath);
          fs.unlinkSync(file.path);
          let summary = ReadFile(fileStoragePath+"/question/summary.txt");
          let background = ReadFile(fileStoragePath+"/question/background.md");
          let description = ReadFile(fileStoragePath+"/question/description.md");
          let inputStatement = ReadFile(fileStoragePath+"/question/inputStatement.md");
          let outputStatement = ReadFile(fileStoragePath+"/question/outputStatement.md");
          let rangeAndHint = ReadFile(fileStoragePath+"/question/rangeAndHint.md");
          if(summary.success && background.success && description.success && inputStatement.success && outputStatement.success && rangeAndHint.success) {
            fs.unlinkSync(fileStoragePath+"/question");
            summary = summary.message.split(/\r?\n/);
            update_question( id.toString(), summary[0], summary[1], summary[2], summary[3], summary[4], background.message, description.message, inputStatement.message, outputStatement.message, rangeAndHint.message, summary[5])
            .then(normalObj => {
              if(normalObj.success) {
                let { arry, row} = decodeConfig(fileStoragePath+"/data/config.txt");
                delete_samples_by_question_id(id.toString())
                .then(normalObj => {
                  if(normalObj.success) {
                    let norObj = InsertSamples(arry,1,row,id,fileStoragePath+"/data/");
                    if(norObj.success) {
                      res.json({
                        success: true,
                        message: '评测数据更新成功'
                      })
                    } else {
                      res.json({
                        success: false,
                        message: norObj.message
                      })
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
          } else {
            res.json({
              success: false,
              message: '文件错误'
            });
          }
        } else {
          res.json({
            success: false,
            message: auth.message
          });
        }
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
        let auth = authentication(cookie);
        if(auth.success) {
          let file = files.data[0];
          let fileStoragePath = "./static/官方题库/"+id;
          fs.unlinkSync(fileStoragePath+"/data");
          unzip(file.path,fileStoragePath);
          fs.unlinkSync(file.path);
          let { arry, row} = decodeConfig(fileStoragePath+"/data/config.txt");
          delete_samples_by_question_id(id.toString())
          .then(normalObj => {
            if(normalObj.success) {
              let norObj = InsertSamples(arry,1,row,id,fileStoragePath+"/data/");
              if(norObj.success) {
                res.json({
                  success: true,
                  message: '评测数据更新成功'
                })
              } else {
                res.json({
                  success: false,
                  message: norObj.message
                })
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

// 修改题目元数据
function problem_change_meta(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let { cookie, id, title, titleEn, type, timeLimit, memoryLimit, background, statement, inputStatement, outputStatement, rangeAndHint, source} = req.body;
    let auth = authentication(cookie);
    if(auth.success) {
      update_question( id.toString(), title, titleEn, type, timeLimit, memoryLimit, background, statement, inputStatement, outputStatement, rangeAndHint, source)
      .then(normalObj => {
        if(normalObj.success) {
          res.json({
            success: true,
            message: '题目修改成功'
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
      });
    } else {
      res.json({
        success: false,
        message: auth.message
      })
    }
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
          let file = files.data[0];
          let fileStoragePath = "./static/官方题库/"+id;
          unzip(file.path,fileStoragePath);
          fs.unlinkSync(file.path);
          let summary = ReadFile(fileStoragePath+"/question/summary.txt");
          let background = ReadFile(fileStoragePath+"/question/题目背景.md");
          let description = ReadFile(fileStoragePath+"/question/题目描述.md");
          let inputStatement = ReadFile(fileStoragePath+"/question/输入格式.md");
          let outputStatement = ReadFile(fileStoragePath+"/question/输出格式.md");
          let rangeAndHint = ReadFile(fileStoragePath+"/question/数据范围与提示.md");
          if(summary.success && background.success && description.success && inputStatement.success && outputStatement.success && rangeAndHint.success) {
            fs.unlinkSync(fileStoragePath+"/question");
            summary = summary.message.split(/\r?\n/);
            insert_question( id.toString(), summary[0], summary[1], summary[2], summary[3], summary[4], background.message, description.message, inputStatement.message, outputStatement.message, rangeAndHint.message, summary[5])
            .then(normalObj => {
              if(normalObj.success) {
                let { arry, row} = decodeConfig(fileStoragePath+"/data/config.txt");
                let norObj = InsertSamples(arry,1,row,id,fileStoragePath+"/data/");
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
          } else {
            res.json({
              success: false,
              message: '文件错误'
            });
          }
        } else {
          res.json({
            success: false,
            message: auth.message
          });
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
              let fileStoragePath = "./static/官方题库/"+id;
              unzip(file.path,fileStoragePath);
              fs.unlinkSync(file.path);
              let { arry, row} = decodeConfig(fileStoragePath+"/data/config.txt");
              let norObj = InsertSamples(arry,1,row,id,fileStoragePath+"/data/");
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

function InsertSamples(arry, i, n, problemid, filepath) {
  if( i == n ) {
    return {
      success: true,
      message: '样例更新成功'
    };
  } else {
    let samplesid = createSessionId();
    let haveinput = FileExist(arry[i][2],filepath);
    let haveoutput = FileExist(arry[i][3],filepath);
    // arry[i][0] : 子任务编号
    // arry[i][1] : 测试点编号
    // arry[i][2] : 输入文件名
    // arry[i][3] : 输出文件名   
    // arry[i][5] : 样例属性
    if( haveinput && haveoutput) {
      return insert_samples(samplesid, problemid, parseInt(arry[i][5]), arry[i][0], arry[i][1], arry[i][2], arry[i][3])
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
    } else {
      return {
        message: '数据缺失',
        success: false
      };
    }
  }
};

function FileExist(filename,filepath) {
  return fs.access(filepath+filename, (err) => {
    if (err) {
      return false;
    } else {
      return true;
    }
  });
}

function ReadFile(filepath) {
  try {
    const data = fs.readFileSync(filepath,'utf-8');
    return {
      success: true,
      message: data.toString()
    };
  } catch(error) {
    return {
      message: error,
      success: false
    };
  }
}

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


function unzip(zipFile, destFolder){
  var zip = new admZip(zipFile);
  var zipEntries = zip.getEntries();
  for(var i=0; i<zipEntries.length; i ++){
      var entry = zipEntries[i];
      entry.entryName = iconv.decode(entry.rawEntryName, 'gbk');
  }
  zip.extractAllTo(destFolder, true);
}

function decodeConfig(filepath){
  let config = ReadFile(filepath);
  config = config.message.split(/\r?\n/);
  let ret = [];
  ret[0] = config[0].split(/\s/);
  let row = parseInt(ret[0][2]);
  let n = 0;
  for(var i=1; n<row; i++) {
    if(config[i] == '') continue;
    n++;
    ret[n] = config[i].split(/\s/);
  }
  return {
    arry: ret,
    row: n
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
