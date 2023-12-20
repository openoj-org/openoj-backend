
const { querySql, queryOne, modifysql } = require('../utils/index');
const md5 = require('../utils/md5');
const boom = require('boom');
const { body, validationResult, Result } = require('express-validator');
const { 
  CODE_ERROR,
  CODE_SUCCESS
} = require('../utils/constant');
var multiparty = require('multiparty');
const { select_user_id_by_cookie, select_user_by_id } = require('../CURDs/userCURD');
const { select_workshop_tags_by_id, insert_workshop_problem, update_workshop_problem, delete_workshop_problem, select_workshop_problem_by_id, select_workshop_problems_by_param_order } = require('../CURDs/problemCURD');
const { select_workshop_score_by_pid_and_uid } = require('../CURDs/evaluationCURD');
const fs = require('fs');
const {v1 : uuidv1} = require('uuid');
const admZip = require('adm-zip');
const iconv    = require('iconv-lite');
const { error } = require('console');
const { select_workshop_samples_by_problem_id, insert_workshop_sample, delete_workshop_sample_by_question_id } = require('../CURDs/dataCURD');

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
function workshop_samples(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let {id} = req.body;
    return select_workshop_samples_by_problem_id(id)
    .then(result =>{
      if(result.success) {
        let fileStoragePath = "./static/workshop/"+id;
        let filedest = "problem"+id+"data/";
        var zip = new admZip();
        result.samples.forEach(element => {
          if(element.attribute<2) {
            let inputpath = fileStoragePath+"/data/"+element.input_filename;
            let outputpath = fileStoragePath+"/data/"+element.output_filename;
            zip.addFile(filedest+element.input_filename,fs.readFileSync(inputpath));
            zip.addFile(filedest+element.output_filename,fs.readFileSync(outputpath));
          }
        });
        zip.writeZip(fileStoragePath+'data.zip');
        res.download(fileStoragePath+'data.zip');
        fs.unlinkSync(fileStoragePath+'data.zip');
      } else {
        res.json({
          success:false,
          message:result.message
        });
      }
    })
    .catch(errorObj =>{
      res.json(errorObj);
    });
  }, false);
}

// 获取题目列表
function workshop_list(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let {evaluation, cookie, order, increase, titleKeyword, sourceKeyword, tagKeyword, start, end} = req.body;
    return select_workshop_problems_by_param_order(order,increase,titleKeyword,sourceKeyword,start,end);
  }, false);
}

// 获取题目信息
function workshop_info(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let {id, evaluation, cookie} = req.body;
    return select_workshop_problem_by_id(id)
    .then(result =>{
      if(result.success) {
        let usr = GetUserScore(id,cookie);
        let samples = [];
        select_workshop_samples_by_problem_id(id)
        .then(normalObj =>{
          if(normalObj.success) {
            let fileStoragePath = "./static/workshop/"+id;
            normalObj.samples.forEach(element => {
              if(element.attribute == 0) {
                let inputstr = fs.readFileSync(fileStoragePath+"/data/"+element.input_filename);
                let outputstr = fs.readFileSync(fileStoragePath+"/data/"+element.output_filename);
                samples.push({display:true,input:inputstr,output:outputstr});
              } else if(element.attribute == 1) {
                samples.push({display:false});
              }
            });
            if(evaluation) {
              select_workshop_tags_by_id(id)
              .then(norObj =>{
                if(norObj.success) {
                  res.json({
                    success: true,
                    message: '获取成功',
                    title: result.title,
                    titleEn: result.titleEn,
                    source: result.source,
                    submit: result.submit,
                    pass: result.pass,
                    score: usr.success?usr.message:undefined,
                    grade: result.grade,
                    tags: norObj.tags,
                    type: result.type,
                    timeLimit: result.timeLimit,
                    memoryLimit: result.memoryLimit,
                    background: result.background,
                    statement: result.statement,
                    inputStatement: result.inputStatement,
                    outputStatement: result.outputStatement,
                    rangeAndHint: result.rangeAndHint,
                    samples: samples
                  });
                } else {
                  res.json({
                    success:false,
                    message:norObj.message
                  });
                }
              })
              .catch(errorObj =>{
                res.json(errorObj);
              });
            } else {
              res.json({
                success: true,
                message: '获取成功',
                title: result.title,
                titleEn: result.titleEn,
                source: result.source,
                submit: result.submit,
                pass: result.pass,
                score: usr.success?usr.message:undefined,
                type: result.type,
                timeLimit: result.timeLimit,
                memoryLimit: result.memoryLimit,
                background: result.background,
                statement: result.statement,
                inputStatement: result.inputStatement,
                outputStatement: result.outputStatement,
                rangeAndHint: result.rangeAndHint,
                samples: samples
              });
            }
          } else {
            res.json({
              success:false,
              message:normalObj.message
            });
          }
        })
        .catch(errorObj =>{
          res.json(errorObj);
        });
        
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

function workshop_import(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let {cookie, id} = req.body;
    let auth = authentication(cookie,1);
    if(auth.success) {
      let fileStoragePath = "./static/workshop/"+id;
      fs.unlinkSync(fileStoragePath);
      delete_workshop_sample_by_question_id(id)
      .then(normalObj => {
        if(normalObj.success) {
          delete_workshop_problem(id)
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

// 删除题目
function workshop_delete(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let {cookie, id} = req.body;
    let auth = authentication(cookie,0);
    if(auth.success) {
      let fileStoragePath = "./static/workshop/"+id;
      fs.unlinkSync(fileStoragePath);
      delete_workshop_sample_by_question_id(id)
      .then(normalObj => {
        if(normalObj.success) {
          delete_workshop_problem(id)
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
function workshop_change_by_file(req, res, next) {
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
        let auth = authentication(cookie,3);
        if(auth.success) {
          let file = files.data[0];
          let fileStoragePath = "./static/workshop/"+id;
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
            update_workshop_problem( id, summary[0], summary[1], summary[2], summary[3], summary[4], background.message, description.message, inputStatement.message, outputStatement.message, rangeAndHint.message, summary[5])
            .then(normalObj => {
              if(normalObj.success) {
                let { arry, row} = decodeConfig(fileStoragePath+"/data/config.txt");
                delete_workshop_sample_by_question_id(id)
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
function workshop_change_data(req, res, next) {
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
        let auth = authentication(cookie,3);
        if(auth.success) {
          let file = files.data[0];
          let fileStoragePath = "./static/workshop/"+id;
          fs.unlinkSync(fileStoragePath+"/data");
          unzip(file.path,fileStoragePath);
          fs.unlinkSync(file.path);
          let { arry, row} = decodeConfig(fileStoragePath+"/data/config.txt");
          delete_workshop_sample_by_question_id(id)
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
function workshop_change_meta(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let { cookie, id, title, titleEn, type, timeLimit, memoryLimit, background, statement, inputStatement, outputStatement, rangeAndHint, source} = req.body;
    let auth = authentication(cookie,3);
    if(auth.success) {
      update_workshop_problem( id, title, titleEn, type, timeLimit, memoryLimit, background, statement, inputStatement, outputStatement, rangeAndHint, source)
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
function workshop_create_by_file(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let form = new multiparty.Form({ uploadDir: './static' });
    return form.parse(req, async (err, fields, files) => {
      if (err) {
        res.json({
          success: false,
          message: err
        });
      } else {
        let { cookie} = fields;
        let auth = authentication(cookie,3);
        if(auth.success) {
          let file = files.data[0];
          let fileStoragePath = "./static/workshop/"+id;
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
            insert_workshop_problem( id, summary[0], summary[1], summary[2], summary[3], summary[4], background.message, description.message, inputStatement.message, outputStatement.message, rangeAndHint.message, summary[5])
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
function workshop_create(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let form = new multiparty.Form({ uploadDir: './static' });
    return form.parse(req, async (err, fields, files) => {
      if (err) {
        res.json({
          success: false,
          message: err
        });
      } else {
        let { cookie, title, titleEn, type, timeLimit, memoryLimit, background, statement, inputStatement, outputStatement, rangeAndHint, source} = fields;
        let id = createSessionId();
        let auth = authentication(cookie,3);
        if(auth.success) {
          insert_workshop_problem( id, title, titleEn, type, timeLimit, memoryLimit, background, statement, inputStatement, outputStatement, rangeAndHint, source)
          .then(normalObj => {
            if(normalObj.success) {
              let file = files.data[0];
              let fileStoragePath = "./static/workshop/"+id;
              unzip(file.path,fileStoragePath);
              fs.unlinkSync(file.path);
              let { arry, row} = decodeConfig(fileStoragePath+"/data/config.txt");
              let norObj = InsertSamples(arry,1,row,id,fileStoragePath+"/data/");
              if(norObj.success) {
                res.json({
                  success: true,
                  message: '题目创建成功',
                  id: id
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
    if( haveinput && haveoutput) {
      return insert_workshop_sample(samplesid, problemid, parseInt(arry[i][5]), arry[i][0], arry[i][1], arry[i][2], arry[i][3])
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

function GetUserScore(id,cookie) {
  return select_user_id_by_cookie(cookie)
  .then(usrid => {
    if(usrid.success) {
      select_workshop_score_by_pid_and_uid(id,usrid.id)
      .then(result =>{
        if(result.success) {
          return {
            success: true,
            message: result.score
          };
        } else {
          return {
            success: false,
            message: result.message
          };
        }
      })
      .catch(errorObj =>{
        return {
          success: false,
          message: errorObj.message
        };
      });
    } else {
      return {
        success: false,
        message: usrid.message
      };
    }
  })
  .catch(errorObj => {
    return {
      success: false,
      message: errorObj.message
    };
  });
}

function authentication(cookie, type) {
  return select_user_id_by_cookie(cookie)
  .then(usrid => {
    if(usrid.success) {
      select_user_by_id(usrid.id)
      .then(usr => {
        if(usr.success) {
          if(usr.character > type) {
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
  workshop_samples,
  workshop_list,
  workshop_info,
  workshop_import,
  workshop_delete,
  workshop_change_by_file,
  workshop_change_data,
  workshop_change_meta,
  workshop_create,
  workshop_create_by_file
}
