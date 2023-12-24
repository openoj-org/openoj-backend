const { querySql, queryOne, modifysql } = require("../utils/index");
const md5 = require("../utils/md5");
const boom = require("boom");
const path = require("path");
const { body, validationResult, Result } = require("express-validator");
const { CODE_ERROR, CODE_SUCCESS } = require("../utils/constant");
const {
  select_official_problem_by_id,
  select_official_tags_by_id,
  delete_official_problem,
  select_official_problems_by_param_order,
  update_official_problem,
  insert_official_problem,
  select_last_evaluation_score_by_pid_and_uid,
  delete_workshop_problem,
  update_workshop_problem,
  insert_workshop_problem,
  select_evaluation_configs_by_id,
} = require("../CURDs/problemCURD");
const {
  insert_subtask,
  delete_subtask_by_problem_id,
} = require("../CURDs/subtaskCURD");
// const { error } = require('console');
// const { setCookie } = require('undici-types');
// const { user } = require('../db/dbConfig');
var multiparty = require("multiparty");
const {
  select_user_id_by_cookie,
  select_user_by_id,
  select_user_character_by_id,
  authenticate_cookie,
  insert_cookie,
} = require("../CURDs/userCURD");
const {
  select_official_score_by_pid_and_uid,
  select_evaluations_by_problem_id,
  delete_data_evaluation_by_evaluation_id,
  delete_subtask_evaluation_by_evaluation_id,
} = require("../CURDs/evaluationCURD");
const {
  delete_official_data_by_problem_id,
  insert_official_data,
  insert_data,
  delete_workshop_data_by_problem_id,
} = require("../CURDs/dataCURD");
const fs = require("fs");
const fsExt = require("fs-extra");
const { v1: uuidv1 } = require("uuid");
const admZip = require("adm-zip");
const iconv = require("iconv-lite");
const { error } = require("console");
const {
  select_official_sample_by_problem_id,
  insert_official_sample,
  delete_official_sample_by_question_id,
} = require("../CURDs/dataCURD");
const {
  delete_rating_by_pid,
  delete_tags_by_id,
  delete_recommendation_by_pid,
} = require("../CURDs/ratingCURD");
const {
  select_posts_by_problem_id,
  delete_reply_by_post_id,
  delete_post_by_problem_id,
} = require("../CURDs/forumCURD");

// 官方题库
const TYPE = 0;

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

// 传入 res.file, 判断是否传入 .zip 文件并解压至 temp 目录
function extractToTemp(file) {
  // 读取缓存文件
  const zipBuffer = file.buffer;

  // 若文件扩展名不为 .zip, 直接报错
  if (path.extname(file.originalname) != ".zip") {
    return {
      success: false,
      message: "文件扩展名不为 .zip",
    };
  }

  // 将文件解压至 temp 下
  const zip = new admZip(zipBuffer);
  const extractDir = "./temp/" + uuidv1();
  try {
    zip.extractAllTo(extractDir, true);
    return { success: true, message: "解压成功", dir: extractDir };
  } catch (e) {
    return { success: false, message: "解压失败" };
  }
}

// 检验上传配置的 zip 文件 (解压至 temp 文件夹后的目录) 是否符合格式要求
function validate_problem_zip_extract(extractPath) {
  try {
    // 文件名列表
    const dataFiles = fs.readdirSync(extractPath);

    // 检查基础的文件列表
    if (
      !dataFiles.includes("description.md") ||
      !dataFiles.includes("inputStatement.md") ||
      !dataFiles.includes("outputStatement.md") ||
      !dataFiles.includes("rangeAndHint.md") ||
      !dataFiles.includes("summary.txt")
    ) {
      return { success: false, message: "文件缺失" };
    }

    let obj = {};
    // 读取 summary.txt
    const data = fs.readFileSync(extractPath + "/summary.txt", "utf8");

    // 按行分隔
    const lines = data.replaceAll("\r", "").split("\n");
    if (lines.length < 5 || lines.length > 6) {
      return { success: false, message: "文件格式有误" };
    }

    /*题目名称。
第二行填写题目英文名称。
第三行填写题目类型，是一个非负整数：0 （代表传统型），1（代表...）。
第四行填写时间限制，是一个正整数，单位：毫秒。
第五行填写空间限制，是一个正整数，单位：MB。
第六行填写题目来源，如果没有则可以只写前五行。 */
    obj.title = lines[0];
    obj.titleEn = lines[1];
    if ((obj.type = Number(lines[2])) != 0) {
      return { success: false, message: "文件格式有误" };
    }
    obj.timeLimit = Number(lines[3]);
    obj.memoryLimit = Number(lines[4]);
    if (lines.length == 6) {
      obj.source = lines[5];
    } else {
      obj.source = "";
    }

    const path = extractPath;
    // 读取描述信息
    if (fs.existsSync(path + "/background.md")) {
      obj.background = fs.readFileSync(path + "/background.md").toString();
    } else {
      obj.background = null;
    }
    obj.statement = fs.readFileSync(path + "/description.md").toString();
    obj.inputStatement = fs
      .readFileSync(path + "/inputStatement.md")
      .toString();
    obj.outputStatement = fs
      .readFileSync(path + "/outputStatement.md")
      .toString();
    obj.rangeAndHint = fs.readFileSync(path + "/rangeAndHint.md").toString();
    return {
      success: true,
      message: "",
      result: obj,
    };
  } catch (e) {
    return { success: false, message: "文件操作出错" };
  }
}

// 检验上传数据的 zip 文件 (解压至 temp 文件夹后的目录) 是否符合格式要求
function validate_data_zip_extract(extractPath) {
  const failValue = {
    success: false,
    message: "数据文件格式错误",
  };
  // 文件名列表
  const dataFiles = fs.readdirSync(extractPath);

  // 检查基础的文件列表
  if (!dataFiles.includes("config.txt")) {
    return failValue;
  }

  // 读取 config.txt
  const data = fs.readFileSync(extractPath + "/config.txt", "utf8");

  // 按行分隔
  const lines = data.replaceAll("\r", "").split("\n");
  if (lines.length < 1) {
    return failValue;
  }

  // 第一行两个整数
  // 是否采用子任务、是否采用 SPJ
  const basicConfigs = lines[0].replace(/\s+/g, " ").split(" ");
  if (basicConfigs.length < 2) {
    return failValue;
  }
  if (basicConfigs[0] !== "0" && basicConfigs[0] !== "1") {
    return failValue;
  }
  if (basicConfigs[1] !== "0" && basicConfigs[1] !== "1") {
    return failValue;
  }

  // 是否使用子任务
  const isSubtaskUsed = Number(basicConfigs[0]);
  // 是否使用 SPJ
  const isSPJUsed = Number(basicConfigs[1]);

  if (
    (isSPJUsed && basicConfigs.length === 2) ||
    (!isSPJUsed && basicConfigs.length === 3)
  ) {
    return failValue;
  }

  // 若使用 SPJ, 其文件名
  const SPJFilename = isSPJUsed ? basicConfigs[2] : null;

  // 使用子任务
  if (isSubtaskUsed) {
    // 创建一个数据结构，用于存储子任务的信息，包括每一个子任务的分数和包含的测试点数量，以及每个测试点的输入文件、输出文件、类型
    // 例如：subtask = [{score: 10, caseNum: 3, cases: [{input: 1.in, output: 1.out, type: 0}, {input: 2.in, output: 2.out, type: 0}, {input: 3.in, output: 3.out, type: 0}]}, {score: 20, caseNum: 2, cases: [{input: 1.in, output: 1.out, type: 0}, {input: 2.in, output: 2.out, type: 0}]}]
    let subtasks = [];
    let subtaskNum = Number(lines[1]);
    if (subtaskNum < 1) {
      return failValue;
    }
    let i = 0;
    let current_line = 2;
    // let task = {
    //   score: 0,
    //   caseNum: subtaskNum,
    //   subtasks: []
    // };
    while (i < subtaskNum) {
      const subtaskConfigs = lines[current_line]
        .replace(/\s+/g, " ")
        .split(" ");
      if (subtaskConfigs.length < 2) {
        return failValue;
      }
      const subtaskCaseNum = Number(subtaskConfigs[0]);
      const subtaskScore = Number(subtaskConfigs[1]);

      if (subtaskScore < 0 || subtaskCaseNum < 1) {
        return failValue;
      }
      // 存储每个子任务的信息
      let subtask = {
        score: subtaskScore,
        caseNum: subtaskCaseNum,
        cases: [],
      };
      // 读取每个子任务的测试点信息
      current_line++;
      let j = 0;
      while (j < subtaskCaseNum) {
        const caseConfigs = lines[current_line].replace(/\s+/g, " ").split(" ");
        if (caseConfigs.length < 3) {
          return failValue;
        }
        const caseInput = caseConfigs[0];
        const caseOutput = caseConfigs[1];
        const caseType = Number(caseConfigs[2]);
        if (caseType !== 0 && caseType !== 1) {
          return failValue;
        }
        // 存储每个测试点的信息
        let testcase = {
          input: caseInput,
          output: caseOutput,
          type: caseType,
        };
        subtask.cases.push(testcase);
        j++;
        current_line++;
      }
      i++;
      subtasks.push(subtask);
    }

    return isSPJUsed
      ? {
          success: true,
          isSubtaskUsed: isSubtaskUsed,
          isSPJUsed: isSPJUsed,
          SPJFilename: SPJFilename,
          subtasks: subtasks,
        }
      : {
          success: true,
          isSubtaskUsed: isSubtaskUsed,
          isSPJUsed: isSPJUsed,
          subtasks: subtasks,
        };
  }
  // 不使用子任务
  else {
    // 读取测试点信息
    let caseNum = Number(lines[1]);
    if (caseNum < 1) {
      return failValue;
    }
    let i = 0;
    let current_line = 2;
    let task = {
      score: 0,
      caseNum: caseNum,
      cases: [],
    };
    while (i < caseNum) {
      const caseConfigs = lines[current_line].replace(/\s+/g, " ").split(" ");
      if (caseConfigs.length < 4) {
        return failValue;
      }
      const caseInput = caseConfigs[0];
      const caseOutput = caseConfigs[1];
      const caseScore = Number(caseConfigs[2]);
      const caseType = Number(caseConfigs[3]);
      if (caseType !== 0 && caseType !== 1) {
        return failValue;
      }
      let _case = {
        input: caseInput,
        output: caseOutput,
        score: caseScore,
        type: caseType,
      };
      task.score = task.score + _case.score;
      task.cases.push(_case);
      i++;
      current_line++;
    }

    return isSPJUsed
      ? {
          success: true,
          isSubtaskUsed: isSubtaskUsed,
          isSPJUsed: isSPJUsed,
          SPJFilename: SPJFilename,
          cases: task.cases,
        }
      : {
          success: true,
          isSubtaskUsed: isSubtaskUsed,
          isSPJUsed: isSPJUsed,
          cases: task.cases,
        };
  }
}

// 检验上传题目的 zip 文件 (解压至 temp 文件夹后的目录) 是否符合格式要求
function validate_zip_extract(extractPath) {
  // 解压后的目录名列表
  const dirs = fs.readdirSync(extractPath);
  if (!dirs.includes("data") || !dirs.includes("question")) {
    return { success: false, message: "目录有误" };
  }

  let problem_info = validate_problem_zip_extract(extractPath + "/question");
  if (!problem_info.success) {
    return problem_info;
  }

  let data_info = validate_data_zip_extract(extractPath + "/data");
  if (!data_info.success) {
    return data_info;
  }

  let ret = {};
  ret.success = true;
  ret.message = "";
  (ret.isSPJUsed = data_info.isSPJUsed)
    ? (ret.SPJFilename = data_info.SPJFilename)
    : {};
  if ((ret.isSubtaskUsed = data_info.isSubtaskUsed)) {
    ret.subtasks = data_info.subtasks;
  } else {
    ret.cases = data_info.cases;
  }
  ret.info = problem_info.result;
  return ret;
}

// 获取题目样例文件
async function problem_samples(req, res, next) {
  let { id } = req.query;
  // 获取除 tag, score 和 sample 外的题目信息
  let problem_info = await select_official_problem_by_id(id);
  if (!problem_info.success) {
    res.json(problem_info);
    return;
  }
  const titleEn = problem_info.result.titleEn;

  // 创建 zip 对象
  let zipDir = "./temp/problem_" + id + "_data.zip";
  let zip = new admZip();

  // 查找样例失败, 返回空 .zip
  let samples = await select_official_sample_by_problem_id(id);
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
async function problem_list(req, res, next) {
  let {
    evaluation,
    cookie,
    order,
    increase,
    titleKeyword,
    sourceKeyword,
    tagKeyword,
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

  let tmp = await select_official_problems_by_param_order(
    order,
    increase,
    titleKeyword,
    sourceKeyword,
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
          let highest_score = await select_official_score_by_pid_and_uid(
            problem.id,
            cookie_verified.id
          );
          problem.score = highest_score.success
            ? highest_score.score
            : undefined;
        } else {
          {
            res.json(cookie_verified);
            return;
          }
        }
      }
    }
    if (evaluation) {
      tmp = await select_official_tags_by_id(problem.id);
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
  // todo: 实现根据tagKeyword筛选
  res.json({
    success: true,
    result: problems,
    count: count,
  });
  return;
}

// 获取题目信息
async function problem_info(req, res, next) {
  let { id, evaluation, cookie } = req.query;
  if (typeof evaluation == "string") evaluation = evaluation == "true";
  try {
    // 获取除 tag, score 和 sample 外的题目信息
    let problem_info = await select_official_problem_by_id(id);
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

    // 不需要获取评分和标签, 则直接返回
    if (!evaluation) {
      delete problem_info.result.grade;
      res.json(problem_info);
      return;
    }

    // 查询 tag 列表
    let tags_info = await select_official_tags_by_id(id);
    problem_info.tags = tags_info.success ? tags_info.tags : [];

    // 检验 cookie 有效性, 若是则根据用户 id 查询 score
    if (cookie != null) {
      let cookie_verified = await authenticate_cookie(cookie, 3);
      if (cookie_verified.success) {
        let highest_score = await select_official_score_by_pid_and_uid(
          id,
          cookie_verified.id
        );
        problem_info.score = highest_score.success ? highest_score.score : 0;
      } else {
        res.json(cookie_verified);
        return;
      }
    }

    // 读取样例
    let samples = await select_official_sample_by_problem_id(id);
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

// 实际用于删除题目数据的函数
async function real_problem_delete_data(id, type) {
  // 获取和本题有关的所有评测的id
  let tmp = await select_evaluations_by_problem_id(id, type == 0);
  if (tmp.success == false) {
    return tmp;
  }
  const evaluations = tmp.result;
  // 获取是否有spj和子任务
  tmp = await select_evaluation_configs_by_id(id, type == 0);
  if (tmp.success == false) {
    return tmp;
  }
  const { isSubtaskUsed, isSPJUsed, SPJFilename } = tmp.result;
  // 如果有spj，删除spj文件
  if (isSPJUsed) {
    fs.rmSync(SPJFilename);
  }
  // 删除所有数据点
  tmp =
    type == 0
      ? await delete_official_data_by_problem_id(id)
      : await delete_workshop_data_by_problem_id(id);
  if (tmp.success == false) {
    return tmp;
  }
  // 删除所有数据点的评测记录
  for (let evaluation of evaluations) {
    tmp = await delete_data_evaluation_by_evaluation_id(evaluation.id);
    if (tmp.success == false) {
      return tmp;
    }
  }
  if (isSubtaskUsed) {
    // 如果采用subtask，同时删除子任务及其评测记录
    tmp = await delete_subtask_by_problem_id(id, type == 0);
    if (tmp.success == false) {
      return tmp;
    }
    // 删除所有子任务的评测记录
    for (let evaluation of evaluations) {
      tmp = await delete_subtask_evaluation_by_evaluation_id(evaluation.id);
      if (tmp.success == false) {
        return tmp;
      }
    }
  }
  // 成功全部删除
  return { success: true };
}

// 实际用于删除题目的函数，删除和一道题目所有相关的内容，功能包括辅助修改题目执行删除+插入题目的操作
async function real_problem_delete(id, type) {
  let tmp = real_problem_delete_data(id, type);
  if (tmp.success == false) return tmp;
  // 删除所有评分信息
  tmp = await delete_rating_by_pid(id, type == 0);
  if (tmp.success == false) {
    return tmp;
  }
  // 如果是创意工坊，还需要删除recommendation
  if (type == 1) {
    tmp = await delete_recommendation_by_pid(id);
    if (tmp.success == false) {
      return tmp;
    }
  }
  // 删除所有标签信息
  tmp = await delete_tags_by_id(id, type == 0);
  if (tmp.success == false) {
    return tmp;
  }
  //获取所有题目相关的帖子
  tmp = await select_posts_by_problem_id(id, type == 0);
  if (tmp.success == false) {
    return tmp;
  }
  const posts = tmp.result;
  // 删除所有相关回复
  for (let post of posts) {
    tmp = await delete_reply_by_post_id(post.id);
    if (tmp.success == false) {
      return tmp;
    }
  }
  // 删除所有相关的帖子
  tmp = await delete_post_by_problem_id(id, type == 0);
  if (tmp.success == false) {
    return tmp;
  }
  tmp =
    type == 0
      ? await delete_official_problem(id)
      : await delete_workshop_problem(id);
  if (tmp.success == false) return tmp;
  return { success: true };
}

// 删除题目
function problem_delete(req, res, next) {
  validateFunction(
    req,
    res,
    next,
    async (req, res, next) => {
      // 从请求体中解析参数
      let { cookie, id } = req.body;

      // 检验 cookie 有效性
      let cookie_verified = await authenticate_cookie(cookie, 0);
      if (!cookie_verified.success) {
        return cookie_verified;
      }

      // 调用真正的删除
      return await real_problem_delete(id, TYPE);
    },
    true
  );
}

// 实际用于插入题目元数据的函数
async function real_problem_insert_problem(id, problemType, info) {
  let tmp =
    problemType == 0
      ? await insert_official_problem(
          id,
          info.title,
          info.titleEn,
          info.type,
          info.timeLimit,
          info.memoryLimit,
          info.background,
          info.statement,
          info.inputStatement,
          info.outputStatement,
          info.rangeAndHint,
          info.source
        )
      : await insert_workshop_problem(
          id,
          info.title,
          info.titleEn,
          info.type,
          info.timeLimit,
          info.memoryLimit,
          info.background,
          info.statement,
          info.inputStatement,
          info.outputStatement,
          info.rangeAndHint,
          info.source
        );
  if (!tmp.success) return tmp;
  return { success: true };
}

// 实际用于更新题目元数据的函数
async function real_problem_update_problem(id, problemType, info) {
  let tmp =
    problemType == 0
      ? await update_official_problem(id, "problem_name", info.title)
      : await update_workshop_problem(id, "problem_name", info.title);
  if (tmp.success == false) return tmp;
  tmp =
    problemType == 0
      ? await update_official_problem(id, "problem_english_name", info.titleEn)
      : await update_workshop_problem(id, "problem_english_name", info.titleEn);
  if (tmp.success == false) return tmp;
  tmp =
    problemType == 0
      ? await update_official_problem(id, "problem_type", info.type)
      : await update_workshop_problem(id, "problem_type", info.type);
  if (tmp.success == false) return tmp;
  tmp =
    problemType == 0
      ? await update_official_problem(id, "problem_time_limit", info.timeLimit)
      : await update_workshop_problem(id, "problem_time_limit", info.timeLimit);
  if (tmp.success == false) return tmp;
  tmp =
    problemType == 0
      ? await update_official_problem(
          id,
          "problem_memory_limit",
          info.memoryLimit
        )
      : await update_workshop_problem(
          id,
          "problem_memory_limit",
          info.memoryLimit
        );
  if (tmp.success == false) return tmp;
  tmp =
    problemType == 0
      ? await update_official_problem(id, "problem_background", info.background)
      : await update_workshop_problem(
          id,
          "problem_background",
          info.background
        );
  if (tmp.success == false) return tmp;
  tmp =
    problemType == 0
      ? await update_official_problem(id, "problem_description", info.statement)
      : await update_workshop_problem(
          id,
          "problem_description",
          info.statement
        );
  if (tmp.success == false) return tmp;
  tmp =
    problemType == 0
      ? await update_official_problem(
          id,
          "problem_input_format",
          info.inputStatement
        )
      : await update_workshop_problem(
          id,
          "problem_input_format",
          info.inputStatement
        );
  if (tmp.success == false) return tmp;
  tmp =
    problemType == 0
      ? await update_official_problem(
          id,
          "problem_output_format",
          info.outputStatement
        )
      : await update_workshop_problem(
          id,
          "problem_output_format",
          info.outputStatement
        );
  if (tmp.success == false) return tmp;
  tmp =
    problemType == 0
      ? await update_official_problem(
          id,
          "problem_data_range_and_hint",
          info.rangeAndHint
        )
      : await update_workshop_problem(
          id,
          "problem_data_range_and_hint",
          info.rangeAndHint
        );
  if (tmp.success == false) return tmp;
  tmp =
    problemType == 0
      ? await update_official_problem(id, "problem_source", info.source)
      : await update_workshop_problem(id, "problem_source", info.source);
  return tmp;
}

// 实际用于插入题目数据的函数，需要题目的元信息存在
async function real_problem_insert_data(id, problemType, info, path) {
  try {
    // 更新spj信息
    let tmp =
      problemType == 0
        ? await update_official_problem(id, "problem_use_spj", info.isSPJUsed)
        : await update_workshop_problem(id, "problem_use_spj", info.isSPJUsed);
    if (!tmp.success) return tmp;
    if (info.isSPJUsed) {
      // 如果使用spj，更新spj路径
      tmp =
        problemType == 0
          ? await update_official_problem(
              id,
              "problem_spj_filename",
              path + "/" + info.SPJFilename
            )
          : await update_workshop_problem(
              id,
              "problem_spj_filename",
              path + "/" + info.SPJFilename
            );
      if (!tmp.success) return tmp;
    }
    // 更新是否使用subtask
    tmp =
      problemType == 0
        ? await update_official_problem(
            id,
            "problem_use_subtask",
            info.isSubtaskUsed
          )
        : await update_workshop_problem(
            id,
            "problem_use_subtask",
            info.isSubtaskUsed
          );
    if (!tmp.success) return tmp;
    if (!info.isSubtaskUsed) {
      // 如果不使用子任务
      const datas = info.cases;
      for (let i = 1; i <= datas.length; i++) {
        const data = datas[i - 1];
        // 初始类型设为不是sample
        let type = "non_sample";
        if (data.type == 0) {
          // 如果该项数据被设置为sample
          const inputLength = fs
            .readFileSync(path + "/" + data.input)
            .toString().length;
          const outputLength = fs
            .readFileSync(path + "/" + data.output)
            .toString().length;
          // 过长则设为隐藏样例
          if (inputLength > 50 || outputLength > 50) type = "hidden_sample";
          else type = "visible_sample";
        }
        tmp = await insert_data(
          id,
          0,
          problemType == 0,
          type,
          0,
          i,
          path + "/" + data.input,
          path + "/" + data.output,
          data.score
        );
        if (!tmp.success) return tmp;
      }
    } else {
      //使用子任务
      const subtasks = info.subtasks;
      for (let i = 1; i <= subtasks.length; i++) {
        const subtask = subtasks[i - 1];
        let tmp = insert_subtask(id, problemType == 0, i, subtask.score);
        if (!tmp.success) return tmp;
        const subtaskId = tmp.id;
        for (let j = 1; j <= subtask.cases; j++) {
          const data = subtask.cases[j - 1];
          // 初始类型设为不是sample
          let type = "non_sample";
          if (data.type == 0) {
            // 如果该项数据被设置为sample
            const inputLength = fs
              .readFileSync(path + "/" + data.input)
              .toString().length;
            const outputLength = fs
              .readFileSync(path + "/" + data.output)
              .toString().length;
            // 过长则设为隐藏样例
            if (inputLength > 50 || outputLength > 50) type = "hidden_sample";
            else type = "visible_sample";
          }
          tmp = await insert_data(
            id,
            subtaskId,
            problemType == 0,
            type,
            0,
            j,
            path + "/" + data.input,
            path + "/" + data.output,
            0
          );
          if (!tmp.success) return tmp;
        }
      }
    }
  } catch (e) {
    return { success: false, message: "文件操作出错" };
  }
  return { success: true };
}

// 完整的插入题目函数，path为纯数据文件最终路径
async function real_problem_insert(id, problemType, info, path) {
  let tmp = await real_problem_insert_problem(id, problemType, info.info);
  if (tmp.success == false) return tmp;
  return await real_problem_insert_data(id, problemType, info, path);
}

// 真正的解压、存储数据文件的函数，返回值：success属性表示是否成功，info属性表示数据信息，path属性表示数据文件存储路径
async function real_extract_data_file(id, problemType, file) {
  try {
    // 将文件解压至 temp 下
    let extract_info = extractToTemp(file);
    if (!extract_info.success) {
      return extract_info;
    }
    const extractDir = extract_info.dir;
    const staticDir =
      `./static/${
        problemType == 0 ? "official_problem" : "workshop_problem"
      }/` +
      id +
      "/data";
    const info = validate_data_zip_extract(extractDir);
    // 检查 .zip 文件的目录
    if (!info.success) {
      fs.rmdirSync(extractDir);
      return {
        success: false,
        message: ".zip 文件目录有误",
      };
    }
    // 若 static 中文件夹不存在则创建
    if (!fs.existsSync(staticDir)) {
      fs.mkdirSync(staticDir, { recursive: true });
    }
    // 将正确的题目数据文件移至 static 文件夹下
    fsExt.copySync(extractDir, staticDir, { overwrite: true });
    // 将 temp 下的临时文件删除
    fsExt.removeSync(extractDir);
    return { success: true, info: info, path: staticDir };
  } catch (e) {
    return { success: false, message: "文件操作出错" };
  }
}

// 真正的解压、存储完整文件的函数，返回值：success属性表示是否成功，info属性表示全部信息，path属性表示数据文件存储路径
async function real_extract_file(id, problemType, file) {
  try {
    // 将文件解压至 temp 下
    let extract_info = extractToTemp(file);
    if (!extract_info.success) {
      return extract_info;
    }

    const extractDir = extract_info.dir;
    const staticDir =
      `./static/${
        problemType == 0 ? "official_problem" : "workshop_problem"
      }/` +
      id +
      "/data";
    const info = validate_zip_extract(extractDir);
    // 检查 .zip 文件的目录
    if (!info.success) {
      fs.rmdirSync(extractDir);
      return {
        success: false,
        message: ".zip 文件目录有误",
      };
    }
    // 若 static 中文件夹不存在则创建
    if (!fs.existsSync(staticDir)) {
      fs.mkdirSync(staticDir, { recursive: true });
    }
    // 将正确的题目数据文件移至 static 文件夹下
    fsExt.copySync(extractDir + "/data", staticDir, { overwrite: true });
    // 将 temp 下的临时文件删除
    fsExt.removeSync(extractDir);
    return { success: true, info: info, path: staticDir };
  } catch (e) {
    return { success: false, message: "文件操作出错" };
  }
}

// 真正的用文件插入数据的函数
async function real_problem_insert_data_file(id, problemType, file) {
  let tmp = await real_extract_data_file(id, problemType, file);
  if (tmp.success == false) return tmp;
  return await real_problem_insert_data(id, problemType, tmp.info, tmp.path);
}

// 真正的用文件插入题目的函数
async function real_problem_insert_file(id, problemType, file) {
  let tmp = await real_extract_file(id, problemType, file);
  if (tmp.success == false) return tmp;
  return await real_problem_insert(id, problemType, tmp.info, tmp.path);
}

// 用文件修改题目
async function problem_change_by_file(req, res, next) {
  let { cookie, id } = req.body;
  // 检验 cookie 有效性
  let cookie_verified = await authenticate_cookie(cookie, 1);
  if (!cookie_verified.success) {
    res.json(cookie_verified);
    return;
  }
  let tmp = await real_problem_delete(id);
  if (!tmp.success) {
    res.json(tmp);
    return;
  }
  res.json(await real_problem_insert_file(id, TYPE, req.file));
  return;
}

// 用文件创建题目
async function problem_create_by_file(req, res, next) {
  let { cookie, id } = req.body;
  // 检验 cookie 有效性
  let cookie_verified = await authenticate_cookie(cookie, 1);
  if (!cookie_verified.success) {
    res.json(cookie_verified);
    return;
  }
  res.json(await real_problem_insert_file(id, TYPE, req.file));
  return;
}

// 修改题目数据
async function problem_change_data(req, res, next) {
  let { cookie, id } = req.body;
  // 检验 cookie 有效性
  let cookie_verified = await authenticate_cookie(cookie, 1);
  if (!cookie_verified.success) {
    res.json(cookie_verified);
    return;
  }
  let tmp = real_problem_delete_data(id, TYPE);
  if (!tmp.success) {
    res.json(tmp);
    return;
  }
  res.json(await real_problem_insert_data_file(id, TYPE, req.file));
  return;
}

// 修改题目元数据
async function problem_change_meta(req, res, next) {
  let { cookie, id } = req.body;
  // 检验 cookie 有效性
  let cookie_verified = await authenticate_cookie(cookie, 1);
  if (!cookie_verified.success) {
    res.json(cookie_verified);
    return;
  }
  res.json(await real_problem_update_problem(id, TYPE, req.body));
  return;
}

// 创建题目
async function problem_create(req, res, next) {
  let { cookie, id } = req.body;
  // 检验 cookie 有效性
  let cookie_verified = await authenticate_cookie(cookie, 1);
  if (!cookie_verified.success) {
    res.json(cookie_verified);
    return;
  }
  let tmp = await real_problem_insert_problem(id, TYPE, req.body);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  res.json(await real_problem_insert_data_file(id, TYPE, req.file));
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
  // console.log(formatedUUID);
  return formatedUUID;
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
  problem_samples,
  problem_list,
  problem_info,
  problem_delete,
  problem_change_by_file,
  problem_change_data,
  problem_change_meta,
  problem_create,
  problem_create_by_file,
};
