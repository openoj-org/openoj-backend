const { querySql, queryOne, modifysql } = require("../utils/index");
const md5 = require("../utils/md5");
const boom = require("boom");
const fsExt = require("fs-extra");
const { body, validationResult, Result } = require("express-validator");
const { CODE_ERROR, CODE_SUCCESS } = require("../utils/constant");
var multiparty = require("multiparty");
const {
  select_user_id_by_cookie,
  select_user_by_id,
  authenticate_cookie,
} = require("../CURDs/userCURD");
const {
  select_workshop_tags_by_id,
  insert_workshop_problem,
  update_workshop_problem,
  delete_workshop_problem,
  select_workshop_problem_by_id,
  select_workshop_problems_by_param_order,
  select_official_problem_by_id,
  insert_official_problem,
  select_evaluation_configs_by_id,
  update_official_problem,
} = require("../CURDs/problemCURD");
const {
  select_workshop_score_by_pid_and_uid,
} = require("../CURDs/evaluationCURD");
const fs = require("fs");
const { v1: uuidv1 } = require("uuid");
const admZip = require("adm-zip");
const iconv = require("iconv-lite");
const { error } = require("console");
const {
  select_workshop_samples_by_problem_id,
  insert_workshop_sample,
  delete_workshop_sample_by_question_id,
  select_official_sample_by_problem_id,
  select_workshop_sample_by_problem_id,
  select_workshop_data_by_problem_id,
  insert_data,
  select_data_by_subtask_id,
  select_sample_by_subtask_id,
} = require("../CURDs/dataCURD");
const {
  real_problem_delete,
  real_problem_insert_file,
  real_problem_delete_data,
  real_problem_insert_data_file,
  real_problem_update_problem,
  real_problem_insert_problem,
} = require("./problemService");
const {
  select_subtask_by_problem_id,
  insert_subtask,
} = require("../CURDs/subtaskCURD");

const TYPE = 1;

// 检查器函数, func 为 CURD 函数, isDefault 表示是否使用默认 JSON 解析
function validateFunction(req, res, next, func, isDefault) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const [{ message }] = err.errors;
    next(boom.badRequest(message));
  } else {
    isDefault
      ? func(req, res, next)
          .then((normalObj) => {
            res.json(normalObj);
          })
          .catch((errorObj) => {
            res.json(errorObj);
          })
      : func(req, res, next).catch((errorObj) => {
          res.json(errorObj);
        });
  }
}
// 获取题目样例文件
async function workshop_samples(req, res, next) {
  let { id } = req.query;
  // 获取除 tag, score 和 sample 外的题目信息
  let problem_info =
    TYPE == 0
      ? await select_official_problem_by_id(id)
      : await select_workshop_problem_by_id(id);
  if (!problem_info.success) {
    res.json(problem_info);
    return;
  }
  const titleEn = problem_info.result.titleEn;

  // 创建 zip 对象
  let zipDir = "./temp/problem_" + id + "_data.zip";
  let zip = new admZip();

  // 查找样例失败, 返回空 .zip
  let samples =
    TYPE == 0
      ? await select_official_sample_by_problem_id(id)
      : await select_workshop_sample_by_problem_id(id);
  if (samples.success) {
    // 将每个样例加入压缩包
    try {
      let index = 0;
      samples.result.forEach((element) => {
        zip.addFile(
          titleEn + (index + 1).toString() + ".in",
          fs.readFileSync(element.input_filename, "utf8")
        );
        zip.addFile(
          titleEn + (index + 1).toString() + ".out",
          fs.readFileSync(element.output_filename, "utf8")
        );
        index += 1;
      });
    } catch (e) {
      res.status(CODE_ERROR).json({
        success: false,
        message: "读取样例文件失败",
      });
      return;
    }
  }

  // 生成压缩包
  try {
    zip.writeZip(zipDir);
  } catch (e) {
    res.status(CODE_ERROR).json({
      success: false,
      message: "创建压缩包失败",
    });
    return;
  }

  // 创建下载任务
  res.download(zipDir, (e) => {
    if (e) {
      res.status(CODE_ERROR).json({
        success: false,
        message: "创建下载任务失败",
      });
    } else {
      fs.rmSync(zipDir);
    }
  });
}

// 获取题目列表
async function workshop_list(req, res, next) {
  let {
    evaluation,
    cookie,
    order,
    increase,
    titleKeyword,
    sourceKeyword,
    tagKeyword,
    authorId,
    authorKeyword,
    start,
    end,
  } = req.query;
  if (typeof evaluation == "string") evaluation = evaluation == "true";

  let userId = null;
  if (cookie != null && cookie != undefined) {
    let tmp = await select_user_id_by_cookie(cookie);
    if (tmp.success == false) {
      res.json(tmp);
      return;
    }
    userId = tmp.id;
  }

  let tmp = await select_workshop_problems_by_param_order(
    order,
    increase,
    titleKeyword,
    sourceKeyword,
    authorId,
    start,
    end
  );
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  let problems = tmp.result,
    count = tmp.count;
  for (let i = 0; i < problems.length; i++) {
    let problem = problems[i];
    if (userId != null) {
      // 检验 cookie 有效性, 若是则根据用户 id 查询 score
      if (cookie != null) {
        let cookie_verified = await authenticate_cookie(cookie, 3);
        if (cookie_verified.success) {
          let highest_score = await select_workshop_score_by_pid_and_uid(
            problem.id,
            cookie_verified.id
          );
          problem.score = highest_score.success
            ? highest_score.result.score
            : undefined;
        } else {
          {
            res.json(cookie_verified);
            return;
          }
        }
      }
    }
    // 查询作者的用户名
    if (problem.userId != null && problem.userId != undefined) {
      let tmp = await select_user_by_id(problem.userId);
      if (tmp.success == false) {
        res.json(tmp);
        return;
      }
      problem.username = tmp.username;
    }
    if (evaluation) {
      tmp = await select_workshop_tags_by_id(problem.id);
      if (tmp.success == false) {
        res.json(tmp);
        return;
      }
      problem.tags = tmp.tags;
    } else {
      delete problem.grade;
    }
    problems[i] = problem;
  }
  // todo: 实现根据tagKeyword和authorKeyword筛选
  res.json({
    success: true,
    result: problems,
    count: count,
  });
  return;
}

// 获取题目信息
async function workshop_info(req, res, next) {
  let { id, evaluation, cookie } = req.query;
  if (typeof evaluation == "string") evaluation = evaluation == "true";
  try {
    // 获取除 tag, score 和 sample 外的题目信息
    let problem_info = await select_workshop_problem_by_id(id);
    if (!problem_info.success) {
      res.json(problem_info);
      return;
    }
    problem_info = problem_info.result;

    switch (problem_info.type) {
      case "traditional":
        problem_info.type = 0;
        break;
      case "interactive":
        problem_info.type = 1;
        break;
      case "answer":
        problem_info.type = 2;
        break;
    }

    // 查询作者的用户名
    if (problem_info.userId != null && problem_info.userId != undefined) {
      let tmp = await select_user_by_id(problem_info.userId);
      if (tmp.success == false) {
        res.json(tmp);
        return;
      }
      problem_info.username = tmp.username;
    }

    // 不需要获取评分和标签, 则直接返回
    if (!evaluation) {
      delete problem_info.result.grade;
      res.json(problem_info);
      return;
    }

    // 查询 tag 列表
    let tags_info = await select_workshop_tags_by_id(id);
    problem_info.tags = tags_info.success ? tags_info.tags : [];

    // 检验 cookie 有效性, 若是则根据用户 id 查询 score
    if (cookie != null) {
      let cookie_verified = await authenticate_cookie(cookie, 3);
      if (cookie_verified.success) {
        let highest_score = await select_workshop_score_by_pid_and_uid(
          id,
          cookie_verified.id
        );
        problem_info.score = highest_score.success
          ? highest_score.result.score
          : 0;
      } else {
        res.json(cookie_verified);
        return;
      }
    }

    // 读取样例
    let samples = await select_workshop_sample_by_problem_id(id);
    if (samples.success) {
      problem_info.samples = samples.result.map((sample) => {
        if (sample.attribute == "hidden_sample") {
          return {
            display: false,
          };
        }
        let input_content = "";
        let output_content = "";
        input_content = fs.readFileSync(sample.input_filename, "utf8");
        output_content = fs.readFileSync(sample.output_filename, "utf8");
        return {
          display: true,
          input: input_content,
          output: output_content,
        };
      });
    } else {
      // 读取样例失败, 更新错误信息并将 samples 字段置空
      problem_info.message = samples.message;
      problem_info.samples = [];
    }

    // 最终返回全部信息
    res.json(problem_info);
    return;
  } catch (e) {
    res.json({ success: false, message: "文件操作出错" });
  }
}

// 真正导入题目的函数，需要目标id对应题目不存在
async function real_problem_import(sourceId, targetId) {
  // 导入题目基本信息
  let tmp = await select_workshop_problem_by_id(sourceId);
  if (tmp.success == false) return tmp;
  const problem_info = tmp.result;
  tmp = await insert_official_problem(
    targetId,
    problem_info.title,
    problem_info.titleEn,
    problem_info.type,
    problem_info.timeLimit,
    problem_info.memoryLimit,
    problem_info.background,
    problem_info.statement,
    problem_info.inputStatement,
    problem_info.outputStatement,
    problem_info.rangeAndHint,
    problem_info.source
  );
  //导入题目数据
  const prePrefix = `./static/workshop_problem/${sourceId}/data`;
  const newPrefix = `./static/official_problem/${targetId}/data`;
  // 若 newPrefix 中文件夹不存在则创建
  if (!fs.existsSync(newPrefix)) {
    fs.mkdirSync(newPrefix, { recursive: true });
  }
  // 将正确的题目数据文件移至 newPrefix 文件夹下
  fsExt.copySync(prePrefix, newPrefix, { overwrite: true });
  // 导入spj信息
  tmp = await select_evaluation_configs_by_id(sourceId, false);
  if (tmp.success == false) return tmp;
  const config_info = tmp.result;
  tmp = await update_official_problem(
    targetId,
    "problem_use_spj",
    config_info.isSPJUsed
  );
  if (!tmp.success) return tmp;
  if (config_info.isSPJUsed) {
    // 如果使用spj，更新spj路径
    tmp = await update_official_problem(
      targetId,
      "problem_spj_filename",
      newPrefix + config_info.SPJFilename.slice(prePrefix.length)
    );
    if (!tmp.success) return tmp;
  }
  // 更新是否使用subtask
  tmp = await update_official_problem(
    targetId,
    "problem_use_subtask",
    config_info.isSubtaskUsed
  );
  if (!tmp.success) return tmp;
  if (!config_info.isSubtaskUsed) {
    // 如果不使用子任务
    tmp = await select_workshop_sample_by_problem_id(sourceId);
    if (!tmp.success) return tmp;
    let datas = tmp.result;
    tmp = await select_workshop_data_by_problem_id(sourceId);
    if (!tmp.success) return tmp;
    datas = datas.concat(tmp.result);
    for (let i = 1; i <= datas.length; i++) {
      const data = datas[i - 1];
      tmp = await insert_data(
        targetId,
        0,
        true,
        data.attribute,
        0,
        i,
        newPrefix + data.input_filename.slice(prePrefix.length),
        newPrefix + data.output_filename.slice(prePrefix.length),
        data.score
      );
      if (!tmp.success) return tmp;
    }
  } else {
    //使用子任务
    tmp = await select_subtask_by_problem_id(sourceId, false);
    if (!tmp.success) return tmp;
    const subtasks = tmp.result;
    for (let i = 1; i <= subtasks.length; i++) {
      const subtask = subtasks[i - 1];
      let tmp = await insert_subtask(targetId, true, i, subtask.score);
      if (!tmp.success) return tmp;
      const subtaskId = tmp.id;
      tmp = await select_sample_by_subtask_id(subtask.id);
      if (!tmp.success) return tmp;
      let datas = tmp.result;
      tmp = await select_data_by_subtask_id(subtask.id);
      if (!tmp.success) return tmp;
      datas = datas.concat(tmp.result);
      for (let j = 1; j <= datas.length; j++) {
        const data = datas[j - 1];
        tmp = await insert_data(
          targetId,
          subtaskId,
          true,
          data.attribute,
          i,
          j,
          newPrefix + data.input_filename.slice(prePrefix.length),
          newPrefix + data.output_filename.slice(prePrefix.length),
          0
        );
        if (!tmp.success) return tmp;
      }
    }
  }
  return { success: true };
}

async function workshop_import(req, res, next) {
  let { cookie, sourceId, targetId } = req.body;

  // 检验 cookie 有效性
  let cookie_verified = await authenticate_cookie(cookie, 1);
  if (!cookie_verified.success) {
    res.json(cookie_verified);
    return;
  }

  // 调用删除
  let tmp = await real_problem_delete(targetId, 0);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }

  res.json(await real_problem_import(sourceId, targetId));
}

// 删除题目
async function workshop_delete(req, res, next) {
  let { cookie, id } = req.body;

  // 检验 cookie 有效性
  let cookie_verified = await authenticate_cookie(cookie, 0);
  if (!cookie_verified.success) {
    res.json(cookie_verified);
    return;
  }

  // 调用真正的删除
  let tmp = await real_problem_delete(id, TYPE);
  res.json(tmp);
  return;
}

// 用文件修改题目
async function workshop_change_by_file(req, res, next) {
  let { cookie, id } = req.body;
  // 检验 cookie 有效性
  let userId = null;
  if (cookie != null && cookie != undefined) {
    let tmp = await select_user_id_by_cookie(cookie);
    if (tmp.success == false) {
      res.json(tmp);
      return;
    }
    userId = tmp.id;
  } else {
    res.json({ success: false, message: "没有cookie" });
    return;
  }
  let tmp = await select_workshop_problem_by_id(id);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  if (tmp.result.userId != userId) {
    res.json({ success: false, message: "你不是本题的作者" });
    return;
  }
  tmp = await real_problem_delete(id, TYPE);
  if (!tmp.success) {
    res.json(tmp);
    return;
  }
  tmp = await real_problem_insert_file(id, TYPE, req.file);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  res.json(await update_workshop_problem(id, "problem_submit_user_id", userId));
  return;
}

// 修改题目数据
async function workshop_change_data(req, res, next) {
  let { cookie, id } = req.body;
  // 检验 cookie 有效性
  let userId = null;
  if (cookie != null && cookie != undefined) {
    let tmp = await select_user_id_by_cookie(cookie);
    if (tmp.success == false) {
      res.json(tmp);
      return;
    }
    userId = tmp.id;
  } else {
    res.json({ success: false, message: "没有cookie" });
    return;
  }
  let tmp = await select_workshop_problem_by_id(id);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  if (tmp.result.userId != userId) {
    res.json({ success: false, message: "你不是本题的作者" });
    return;
  }
  tmp = real_problem_delete_data(id, TYPE);
  if (!tmp.success) {
    res.json(tmp);
    return;
  }
  tmp = await real_problem_insert_data_file(id, TYPE, req.file);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  res.json(await update_workshop_problem(id, "problem_submit_user_id", userId));
  return;
}

// 修改题目元数据
async function workshop_change_meta(req, res, next) {
  let { cookie, id } = req.body;
  // 检验 cookie 有效性
  let userId = null;
  if (cookie != null && cookie != undefined) {
    let tmp = await select_user_id_by_cookie(cookie);
    if (tmp.success == false) {
      res.json(tmp);
      return;
    }
    userId = tmp.id;
  } else {
    res.json({ success: false, message: "没有cookie" });
    return;
  }
  let tmp = await select_workshop_problem_by_id(id);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  if (tmp.result.userId != userId) {
    res.json({ success: false, message: "你不是本题的作者" });
    return;
  }
  tmp = await real_problem_update_problem(id, TYPE, req.body);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  res.json(await update_workshop_problem(id, "problem_submit_user_id", userId));
  return;
}

// 用文件创建题目
async function workshop_create_by_file(req, res, next) {
  let { cookie } = req.body;
  const id = createSessionId();
  let userId = null;
  if (cookie != null && cookie != undefined) {
    let tmp = await select_user_id_by_cookie(cookie);
    if (tmp.success == false) {
      res.json(tmp);
      return;
    }
    userId = tmp.id;
  } else {
    res.json({ success: false, message: "没有cookie" });
    return;
  }
  let tmp = await real_problem_insert_file(id, TYPE, req.file);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  res.json(await update_workshop_problem(id, "problem_submit_user_id", userId));
  return;
}

// 创建题目
async function workshop_create(req, res, next) {
  let { cookie } = req.body;
  const id = createSessionId();
  let userId = null;
  if (cookie != null && cookie != undefined) {
    let tmp = await select_user_id_by_cookie(cookie);
    if (tmp.success == false) {
      res.json(tmp);
      return;
    }
    userId = tmp.id;
  } else {
    res.json({ success: false, message: "没有cookie" });
    return;
  }
  let tmp = await real_problem_insert_problem(id, TYPE, req.body);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  tmp = await real_problem_insert_data_file(id, TYPE, req.file);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  res.json(await update_workshop_problem(id, "problem_submit_user_id", userId));
}

function InsertSamples(arry, i, n, problemid, filepath) {
  if (i == n) {
    return {
      success: true,
      message: "样例更新成功",
    };
  } else {
    let samplesid = createSessionId();
    let haveinput = FileExist(arry[i][2], filepath);
    let haveoutput = FileExist(arry[i][3], filepath);
    if (haveinput && haveoutput) {
      return insert_workshop_sample(
        samplesid,
        problemid,
        parseInt(arry[i][5]),
        arry[i][0],
        arry[i][1],
        arry[i][2],
        arry[i][3]
      )
        .then((result) => {
          if (result.success) {
            return InsertSamples(arry, i + 1, n, problemid);
          } else {
            return {
              message: result.message,
              success: false,
            };
          }
        })
        .catch((errorObj) => {
          return {
            message: errorObj.message,
            success: false,
          };
        });
    } else {
      return {
        message: "数据缺失",
        success: false,
      };
    }
  }
}

function FileExist(filename, filepath) {
  return fs.access(filepath + filename, (err) => {
    if (err) {
      return false;
    } else {
      return true;
    }
  });
}

function ReadFile(filepath) {
  try {
    const data = fs.readFileSync(filepath, "utf-8");
    return {
      success: true,
      message: data.toString(),
    };
  } catch (error) {
    return {
      message: error,
      success: false,
    };
  }
}

function createSessionId() {
  var formatedUUID = uuidv1();
  return formatedUUID;
}

function GetUserScore(id, cookie) {
  return select_user_id_by_cookie(cookie)
    .then((usrid) => {
      if (usrid.success) {
        select_workshop_score_by_pid_and_uid(id, usrid.id)
          .then((result) => {
            if (result.success) {
              return {
                success: true,
                message: result.score,
              };
            } else {
              return {
                success: false,
                message: result.message,
              };
            }
          })
          .catch((errorObj) => {
            return {
              success: false,
              message: errorObj.message,
            };
          });
      } else {
        return {
          success: false,
          message: usrid.message,
        };
      }
    })
    .catch((errorObj) => {
      return {
        success: false,
        message: errorObj.message,
      };
    });
}

function authentication(cookie, type) {
  return select_user_id_by_cookie(cookie)
    .then((usrid) => {
      if (usrid.success) {
        select_user_by_id(usrid.id)
          .then((usr) => {
            if (usr.success) {
              if (usr.character > type) {
                return {
                  success: false,
                  message: "无管理权限",
                };
              } else {
                return {
                  success: true,
                  message: "验证成功",
                };
              }
            } else {
              return {
                success: false,
                message: usr.message,
              };
            }
          })
          .catch((errorObj) => {
            return {
              success: false,
              message: errorObj.message,
            };
          });
      } else {
        return {
          success: false,
          message: usrid.message,
        };
      }
    })
    .catch((errorObj) => {
      return {
        success: false,
        message: errorObj.message,
      };
    });
}

function unzip(zipFile, destFolder) {
  var zip = new admZip(zipFile);
  var zipEntries = zip.getEntries();
  for (var i = 0; i < zipEntries.length; i++) {
    var entry = zipEntries[i];
    entry.entryName = iconv.decode(entry.rawEntryName, "gbk");
  }
  zip.extractAllTo(destFolder, true);
}

function decodeConfig(filepath) {
  let config = ReadFile(filepath);
  config = config.message.split(/\r?\n/);
  let ret = [];
  ret[0] = config[0].split(/\s/);
  let row = parseInt(ret[0][2]);
  let n = 0;
  for (var i = 1; n < row; i++) {
    if (config[i] == "") continue;
    n++;
    ret[n] = config[i].split(/\s/);
  }
  return {
    arry: ret,
    row: n,
  };
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
  workshop_create_by_file,
};
