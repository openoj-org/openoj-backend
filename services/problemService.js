
const { querySql, queryOne, modifysql } = require('../utils/index');
const md5 = require('../utils/md5');
const boom = require('boom');
const path = require('path');
const { body, validationResult, Result } = require('express-validator');
const { 
  CODE_ERROR,
  CODE_SUCCESS
} = require('../utils/constant');
const { select_official_problem_by_id, select_official_tags_by_id, delete_official_problem } = require('../CURDs/problemCURD');
// const { error } = require('console');
// const { setCookie } = require('undici-types');
// const { user } = require('../db/dbConfig');
var multiparty = require('multiparty');
const { select_user_id_by_cookie, select_user_by_id, select_user_character_by_id, authenticate_cookie } = require('../CURDs/userCURD');
const { select_official_score_by_pid_and_uid } = require('../CURDs/evaluationCURD');
const {
  delete_official_sample_by_problem_id
} = require('../CURDs/sampleCURD');
const fs = require('fs');
const fsExt = require('fs-extra');
const {v1 : uuidv1} = require('uuid');
const admZip = require('adm-zip');
const iconv    = require('iconv-lite');
const { error } = require('console');
const { select_official_samples_by_problem_id, insert_official_sample, delete_official_sample_by_question_id } = require('../CURDs/sampleCURD');

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

// 检验上传数据的 zip 文件 (解压至 temp 文件夹后的目录) 是否符合格式要求
function validate_data_zip_extract(extractPath) {
  // 文件名列表
  const dataFiles = fs.readdirSync(extractPath);

  // 检查基础的文件列表
  if (!dataFiles.includes('config.txt')) {
    return false;
  }

  // 读取 config.txt
  fs.readFile(extractPath + '/config.txt', 'utf8', (err, data) => {
    if (err) {
      return false;
    }

    // 按行分隔
    const lines = data.split('\n');
    if (lines.length < 1) {
      return false;
    }

    // 第一行两个整数
    // 是否采用子任务、是否采用 SPJ
    const basicConfigs = lines[0].split(' ');
    if (basicConfigs.length < 2) {
      return false;
    }
    // let isSubtaskUsed = Number(basicConfigs[0]);
    // let isSPJUsed = Number(basicConfigs[1]);
    // let SPJ
    if (isSPJUsed) {
      // let 
    }
  });

  return true;
}

// 检验上传题目的 zip 文件 (解压至 temp 文件夹后的目录) 是否符合格式要求
function validate_zip_extract(extractPath) {
  // 解压后的目录名列表
  const dirs = fs.readdirSync(extractPath);
  if (!dirs.includes('data') || !dirs.includes('question')) {
    return false;
  }

  // data 和 question 目录下分别的文件名列表
  const dataFiles = fs.readdirSync(extractPath + '/data');
  const questionFiles = fs.readdirSync(extractPath + '/question');

  // 检查基础的文件列表
  if (!questionFiles.includes('summary.txt') ||
      !questionFiles.includes('description.md') ||
      !questionFiles.includes('inputStatement.md') ||
      !questionFiles.includes('outputStatement.md') ||
      !questionFiles.includes('rangeAndHint.md')) {
    return false;
  }
  if (!dataFiles.includes('config.txt')) {
    return false;
  }

  return true;
}

// 获取题目样例文件
function problem_samples(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let {id} = req.body;
    return select_official_samples_by_problem_id(id)
    .then(result =>{
      if(result.success) {
        let fileStoragePath = "./static/official/"+id;
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
function problem_list(req, res, next) {
  validateFunction(req, res, next, (req, res, next) => {
    let {evaluation, cookie, order, increase, titleKeyword, sourceKeyword, tagKeyword, start, end} = req.body;
    return select_official_problems_by_param_order(order,increase,titleKeyword,sourceKeyword,start,end);
  }, false);
}

// 获取题目信息
function problem_info(req, res, next) {
  validateFunction(req, res, next, async (req, res, next) => {
    let { id, evaluation, cookie } = req.query;
    if (typeof evaluation == 'string')
      evaluation = (evaluation == 'true');
    try {
      // 获取除 tag, score 和 sample 外的题目信息
      let problem_info = await select_official_problem_by_id(id);
      if (!problem_info.success) {
        return problem_info;
      }

      // 不需要获取评分和标签, 则直接返回
      if (!evaluation) {
        delete problem_info.result.grade;
        return problem_info;
      }

      // 查询 tag 列表
      let tags_info = await select_official_tags_by_id(id);
      problem_info.tags = (tags_info.success ? tags_info.tags : []);

      // 检验 cookie 有效性, 若是则根据用户 id 查询 score
      if (cookie != null) {
        let cookie_verified = await authenticate_cookie(cookie, 3);
        if (cookie_verified.success) {
          let highest_score = await select_official_score_by_pid_and_uid(id, cookie_verified.id);
          problem_info.score = (highest_score.success ? highest_score.score : 0);
        } else {
          problem_info.message = cookie_verified.message;
        }
      }

      // TODO: 读取样例

      // 最终返回全部信息
      return problem_info;
    } catch (e) {
      return e;
    }
  }, true);
}

// 删除题目
function problem_delete(req, res, next) {
  validateFunction(req, res, next, async (req, res, next) => {
    // 从请求体中解析参数
    let { cookie, id } = req.body;

    // 检验 cookie 有效性
    let cookie_verified = await authenticate_cookie(cookie, 0);
    if (!cookie_verified.success) {
      return cookie_verified;
    }

    // 删除题目的数据文件
    let fileStoragePath = "./static/官方题库/" + id;
    fs.unlinkSync(fileStoragePath);

    // 删除数据库中的样例和问题
    let flag_sample = await delete_official_sample_by_problem_id(id).success;
    let flag_problem = await delete_official_problem(id).success;

    return {
      success: flag_sample && flag_problem,
      message: ('删除题目' + ((flag_sample && flag_problem) ? '成功' : '失败'))
    };
  }, true);
}

// 用文件修改题目
function problem_change_by_file(req, res, next) {
  validateFunction(req, res, next, async (req, res, next) => {
    // 从请求体中解析参数
    let { cookie, id } = req.body;

    // 读取缓存文件
    const zipBuffer = req.file.buffer;

    // 若文件扩展名不为 .zip, 直接报错
    if (path.extname(req.file.originalname) != '.zip') {
      return {
        success: false,
        message: '请上传 .zip 文件'
      };
    };

    // 将文件解压至 temp 下
    const zip = new admZip(zipBuffer);
    const extractDir = './temp/' + uuidv1();
    const staticDir = './static/' + id;
    zip.extractAllTo(extractDir, true);

    // 检查 .zip 文件的目录
    if (!validate_zip_extract(extractDir)) {
      fs.rmdirSync(extractDir);
      return {
        success: false,
        message: '.zip 文件目录有误'
      };
    }

    // 若 static 中文件夹不存在则创建
    if (!fs.existsSync(staticDir)) {
      fs.mkdirSync(staticDir);
    }

    // 将正确的题目数据文件移至 static 文件夹下
    fsExt.copySync(extractDir, staticDir);
    
    // 将 temp 下的临时文件删除
    fsExt.removeSync(extractDir);

    return {
      success: true,
      message: '修改题目信息成功'
    };
  }, true);
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
          let fileStoragePath = "./static/official/"+id;
          fs.unlinkSync(fileStoragePath+"/data");
          unzip(file.path,fileStoragePath);
          fs.unlinkSync(file.path);
          let { arry, row} = decodeConfig(fileStoragePath+"/data/config.txt");
          delete_official_sample_by_question_id(id.toString())
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
    let { cookie, id, title, titleEn, type, timeLimit, memoryLimit, background, statement, inputStatement, outputStatement, rangeAndHint, source } = req.body;
    let auth = authentication(cookie);
    if(auth.success) {
      update_official_problem( id.toString(), title, titleEn, type, timeLimit, memoryLimit, background, statement, inputStatement, outputStatement, rangeAndHint, source)
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
          let fileStoragePath = "./static/official/"+id;
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
            insert_official_problem( id.toString(), summary[0], summary[1], summary[2], summary[3], summary[4], background.message, description.message, inputStatement.message, outputStatement.message, rangeAndHint.message, summary[5])
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
          insert_official_problem( id.toString(), title, titleEn, type, timeLimit, memoryLimit, background, statement, inputStatement, outputStatement, rangeAndHint, source)
          .then(normalObj => {
            if(normalObj.success) {
              let file = files.data[0];
              let fileStoragePath = "./static/official/"+id;
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
    if( haveinput && haveoutput) {
      return insert_official_sample(samplesid, problemid, parseInt(arry[i][5]), arry[i][0], arry[i][1], arry[i][2], arry[i][3])
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

function unzip(zipFile, destFolder) {
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
