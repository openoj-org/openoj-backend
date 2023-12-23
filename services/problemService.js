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
} = require("../CURDs/problemCURD");
const { insert_subtask } = require("../CURDs/subtaskCURD");
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
} = require("../CURDs/evaluationCURD");
const {
  delete_official_data_by_problem_id,
  insert_official_data,
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

  // 读取 summary.txt
  fs.readFile(extractPath + "/config.txt", "utf8", (err, data) => {
    if (err) {
      return { success: false, message: "读取文件失败" };
    }

    // 按行分隔
    const lines = data.split("\n");
    if (lines.length < 5 || lines.length > 6) {
      return { success: false, message: "文件格式有误" };
    }

    /*题目名称。
第二行填写题目英文名称。
第三行填写题目类型，是一个非负整数：0 （代表传统型），1（代表...）。
第四行填写时间限制，是一个正整数，单位：毫秒。
第五行填写空间限制，是一个正整数，单位：MB。
第六行填写题目来源，如果没有则可以只写前五行。 */
    let obj = {};
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
  });
  return {
    success: true,
    message: "",
    result: obj,
  };
}

// 检验上传数据的 zip 文件 (解压至 temp 文件夹后的目录) 是否符合格式要求
function validate_data_zip_extract(extractPath) {
  // 文件名列表
  const dataFiles = fs.readdirSync(extractPath);

  // 检查基础的文件列表
  if (!dataFiles.includes("config.txt")) {
    return { success: false };
  }

  // 读取 config.txt
  fs.readFile(extractPath + "/config.txt", "utf8", (err, data) => {
    if (err) {
      return { success: false };
    }

    // 按行分隔
    const lines = data.split("\n");
    if (lines.length < 1) {
      return { success: false };
    }

    // 第一行两个整数
    // 是否采用子任务、是否采用 SPJ
    const basicConfigs = lines[0].split(" ");
    if (basicConfigs.length < 2 || basicConfigs.length > 3) {
      return { success: false };
    }
    if (basicConfigs[0] !== "0" && basicConfigs[0] !== "1") {
      return { success: false };
    }
    if (basicConfigs[1] !== "0" && basicConfigs[1] !== "1") {
      return { success: false };
    }

    // 是否使用子任务
    const isSubtaskUsed = Number(basicConfigs[0]);
    // 是否使用 SPJ
    const isSPJUsed = Number(basicConfigs[1]);

    if (
      (isSPJUsed && basicConfigs.length === 2) ||
      (!isSPJUsed && basicConfigs.length === 3)
    ) {
      return { success: false };
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
        return { success: false };
      }
      let i = 0;
      let current_line = 2;
      // let task = {
      //   score: 0,
      //   caseNum: subtaskNum,
      //   subtasks: []
      // };
      while (i < subtaskNum) {
        const subtaskConfigs = lines[current_line].split(" ");
        if (subtaskConfigs.length !== 2) {
          return { success: false };
        }
        const subtaskCaseNum = Number(subtaskConfigs[0]);
        const subtaskScore = Number(subtaskConfigs[1]);

        if (subtaskScore < 1 || subtaskCaseNum < 1) {
          return { success: false };
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
          const caseConfigs = lines[current_line].split(" ");
          if (caseConfigs.length !== 3) {
            return { success: false };
          }
          const caseInput = caseConfigs[0];
          const caseOutput = caseConfigs[1];
          const caseType = Number(caseConfigs[2]);
          if (caseType !== 0 && caseType !== 1) {
            return { success: false };
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
    } // TODO: 不使用子任务
    // 不使用子任务
    else {
      // 读取测试点信息
      let caseNum = Number(lines[1]);
      if (caseNum < 1) {
        return { success: false };
      }
      let i = 0;
      let current_line = 2;
      let task = {
        score: 0,
        caseNum: caseNum,
        cases: [],
      };
      while (i < caseNum) {
        const caseConfigs = lines[current_line].split(" ");
        if (caseConfigs.length !== 4) {
          return { success: false };
        }
        const caseInput = caseConfigs[0];
        const caseOutput = caseConfigs[1];
        const caseScore = Number(caseConfigs[2]);
        const caseType = Number(caseConfigs[3]);
        if (caseType !== 0 && caseType !== 1) {
          return { success: false };
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
            subtasks: task.cases,
          }
        : {
            success: true,
            isSubtaskUsed: isSubtaskUsed,
            isSPJUsed: isSPJUsed,
            subtasks: task.cases,
          };
    }
  });
}

// 检验上传题目的 zip 文件 (解压至 temp 文件夹后的目录) 是否符合格式要求
function validate_zip_extract(extractPath) {
  // 解压后的目录名列表
  const dirs = fs.readdirSync(extractPath);
  if (!dirs.includes("data") || !dirs.includes("question")) {
    return { success: false, message: "目录有误" };
  }

  let data_info = validate_data_zip_extract(extractPath + "/data");
  let problem_info = validate_problem_zip_extract(extractPath + "/problem");
  if (!problem_info.success) {
    return problem_info;
  }
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
    ret.cases = data_info.subtasks;
  }
  ret.info = problem_info.result;
  return ret;
}

// 获取题目样例文件
function problem_samples(req, res, next) {
  validateFunction(
    req,
    res,
    next,
    async (req, res, next) => {
      let { id } = req.query;

      // 创建 zip 对象
      let zipDir = "./temp/problem_" + id + "_data.zip";
      let zip = new admZip();

      // 查找样例失败, 返回空 .zip
      let samples = await select_official_sample_by_problem_id(id);
      if (samples.success) {
        // 将每个样例加入压缩包
        try {
          // console.log(samples);
          samples.result.forEach((element) => {
            let dataDir = "./static/official_problem/" + id + "/data/";
            zip.addFile(
              element.input_filename,
              fs.readFileSync(dataDir + element.input_filename, "utf8")
            );
            zip.addFile(
              element.output_filename,
              fs.readFileSync(dataDir + element.output_filename, "utf8")
            );
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
    },
    false
  );
}

// 获取题目列表
function problem_list(req, res, next) {
  validateFunction(
    req,
    res,
    next,
    async (req, res, next) => {
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

      let problems = await select_official_problems_by_param_order(
        order,
        increase,
        titleKeyword,
        sourceKeyword,
        start,
        end
      );
      return problems; //TODO add problems to res
    },
    false
  );
}

// 获取题目信息
function problem_info(req, res, next) {
  validateFunction(
    req,
    res,
    next,
    async (req, res, next) => {
      let { id, evaluation, cookie } = req.query;
      if (typeof evaluation == "string") evaluation = evaluation == "true";
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
        problem_info.tags = tags_info.success ? tags_info.tags : [];

        // 检验 cookie 有效性, 若是则根据用户 id 查询 score
        if (cookie != null) {
          let cookie_verified = await authenticate_cookie(cookie, 3);
          if (cookie_verified.success) {
            let highest_score = await select_official_score_by_pid_and_uid(
              id,
              cookie_verified.id
            );
            problem_info.score = highest_score.success
              ? highest_score.score
              : 0;
          } else {
            problem_info.message = cookie_verified.message;
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
            try {
              input_content = fs.readFileSync(
                "./static/official_problem/" +
                  id +
                  "/data/" +
                  sample.input_filename,
                "utf8"
              );
            } catch (err) {
              input_content = "读取输入时发生错误";
            }
            try {
              output_content = fs.readFileSync(
                "./static/official_problem/" +
                  id +
                  "/data/" +
                  sample.output_filename,
                "utf8"
              );
            } catch (err) {
              input_content = "读取输入时发生错误";
            }
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
        return problem_info;
      } catch (e) {
        return e;
      }
    },
    true
  );
}

// 实际用于删除题目的函数，删除和一道题目所有相关的内容，功能包括辅助修改题目执行删除+插入题目的操作
async function real_problem_delete(id) {
  // 先获取是否有spj和子任务
  let tmp = await select_evaluation_configs_by_id(id, true);
  if (tmp.success == false) {
    return tmp;
  }
  const { isSubtaskUsed, isSPJUsed, SPJFilename } = tmp.result;
  // 如果有spj，删除spj文件
  if (isSPJUsed) {
    fs.rmSync(SPJFilename);
  }
  if (!isSubtaskUsed) {
    // 如果不采用subtask，删除所有测试点
    tmp = await delete_official_data_by_problem_id(id);
    if (tmp.success == false) {
      return tmp;
    }
  }
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

      // 删除题目的数据文件
      let fileStoragePath = "./static/官方题库/" + id;
      fs.unlinkSync(fileStoragePath);

      // 删除数据库中的样例和问题
      let flag_sample = await delete_official_sample_by_problem_id(id).success;
      let flag_problem = await delete_official_problem(id).success;

      return {
        success: flag_sample && flag_problem,
        message: "删除题目" + (flag_sample && flag_problem ? "成功" : "失败"),
      };
    },
    true
  );
}

// 用文件修改题目
function problem_change_by_file(req, res, next) {
  // TODO
}

// 用文件创建题目
function problem_create_by_file(req, res, next) {
  validateFunction(
    req,
    res,
    next,
    async (req, res, next) => {
      // 从请求体中解析参数
      let { cookie, id } = req.body;

      // 检验 cookie 有效性
      let cookie_verified = await authenticate_cookie(cookie, 1);
      if (!cookie_verified.success) {
        return cookie_verified;
      }

      // 将文件解压至 temp 下
      let extract_info = extractToTemp(req.file);
      if (!extract_info.success) {
        return extract_info;
      }

      const extractDir = extract_info.dir;
      const fatherDir = "./static/offcial_problem/";
      const staticDir = fatherDir + id;
      try {
        const info = validate_zip_extract(extractDir);
        // 检查 .zip 文件的目录
        if (!info.success) {
          fs.rmdirSync(extractDir);
          return {
            success: false,
            message: ".zip 文件目录有误",
          };
        }
        // 先根据info信息，修改题目元数据
        // todo: 处理更新题目数据后，题目的评测记录和数据可能对不上的问题
        // 将题目描述部分的文件进行读取并加入数据库中
        let background = null;
        if (fs.existsSync(extractDir + "/question/background.md")) {
          background = fs
            .readFileSync(extractDir + "/question/background.md")
            .toString();
        }
        const description = fs
          .readFileSync(extractDir + "/question/description.md")
          .toString();
        const inputFormat = fs
          .readFileSync(extractDir + "/question/inputFormat.md")
          .toString();
        const outputFormat = fs
          .readFileSync(extractDir + "/question/outputFormat.md")
          .toString();
        const rangeAndHint = fs
          .readFileSync(extractDir + "/question/rangeAndHint.md")
          .toString();
        // 若 static 中父文件夹不存在则创建
        if (!fs.existsSync(fatherDir)) {
          fs.mkdirSync(fatherDir);
        }
        // 若 static 中文件夹不存在则创建
        if (!fs.existsSync(staticDir)) {
          fs.mkdirSync(staticDir);
        }
        let tmp = await insert_official_problem(
          id,
          info.info.title,
          info.info.titleEn,
          info.info.type,
          info.info.timeLimit,
          info.info.memoryLimit,
          background,
          description,
          inputFormat,
          outputFormat,
          rangeAndHint,
          info.info.source
        );
        if (!tmp.success) return tmp;
        // 将正确的题目数据文件移至 static 文件夹下
        fsExt.copySync(extractDir + "/data", staticDir, { overwrite: true });
        // 将 temp 下的临时文件删除
        fsExt.removeSync(extractDir);
      } catch (e) {
        return {
          success: false,
          message: "修改题目信息失败",
        };
      }
      return {
        success: true,
        message: "修改题目信息成功",
      };
    },
    true
  );
}

// 修改题目数据
function problem_change_data(req, res, next) {
  validateFunction(
    req,
    res,
    next,
    (req, res, next) => {
      let form = new multiparty.Form({ uploadDir: "./static" });
      return form.parse(req, async (err, fields, files) => {
        if (err) {
          res.json({
            success: false,
            message: err,
          });
        } else {
          let { cookie, id } = fields;
          let auth = authentication(cookie);
          if (auth.success) {
            let file = files.data[0];
            let fileStoragePath = "./static/official/" + id;
            fs.unlinkSync(fileStoragePath + "/data");
            unzip(file.path, fileStoragePath);
            fs.unlinkSync(file.path);
            let { arry, row } = decodeConfig(
              fileStoragePath + "/data/config.txt"
            );
            delete_official_sample_by_question_id(id.toString())
              .then((normalObj) => {
                if (normalObj.success) {
                  let norObj = InsertSamples(
                    arry,
                    1,
                    row,
                    id,
                    fileStoragePath + "/data/"
                  );
                  if (norObj.success) {
                    res.json({
                      success: true,
                      message: "评测数据更新成功",
                    });
                  } else {
                    res.json({
                      success: false,
                      message: norObj.message,
                    });
                  }
                } else {
                  res.json({
                    success: false,
                    message: normalObj.message,
                  });
                }
              })
              .catch((errorObj) => {
                res.json(errorObj);
              });
          } else {
            res.json({
              success: false,
              message: auth.message,
            });
          }
        }
      });
    },
    false
  );
}

// 修改题目元数据
function problem_change_meta(req, res, next) {
  validateFunction(
    req,
    res,
    next,
    (req, res, next) => {
      let {
        cookie,
        id,
        title,
        titleEn,
        type,
        timeLimit,
        memoryLimit,
        background,
        statement,
        inputStatement,
        outputStatement,
        rangeAndHint,
        source,
      } = req.body;
      let auth = authentication(cookie);
      if (auth.success) {
        update_official_problem(
          id.toString(),
          title,
          titleEn,
          type,
          timeLimit,
          memoryLimit,
          background,
          statement,
          inputStatement,
          outputStatement,
          rangeAndHint,
          source
        )
          .then((normalObj) => {
            if (normalObj.success) {
              res.json({
                success: true,
                message: "题目修改成功",
              });
            } else {
              res.json({
                success: false,
                message: normalObj.message,
              });
            }
          })
          .catch((errorObj) => {
            res.json(errorObj);
          });
      } else {
        res.json({
          success: false,
          message: auth.message,
        });
      }
    },
    false
  );
}

// // 用文件创建题目
// function problem_create_by_file(req, res, next) {
//   validateFunction(
//     req,
//     res,
//     next,
//     (req, res, next) => {
//       let form = new multiparty.Form({ uploadDir: "./static" });
//       return form.parse(req, async (err, fields, files) => {
//         if (err) {
//           res.json({
//             success: false,
//             message: err,
//           });
//         } else {
//           let { cookie, id } = fields;
//           let auth = authentication(cookie);
//           if (auth.success) {
//             let file = files.data[0];
//             let fileStoragePath = "./static/official/" + id;
//             unzip(file.path, fileStoragePath);
//             fs.unlinkSync(file.path);
//             let summary = ReadFile(fileStoragePath + "/question/summary.txt");
//             let background = ReadFile(
//               fileStoragePath + "/question/background.md"
//             );
//             let description = ReadFile(
//               fileStoragePath + "/question/description.md"
//             );
//             let inputStatement = ReadFile(
//               fileStoragePath + "/question/inputStatement.md"
//             );
//             let outputStatement = ReadFile(
//               fileStoragePath + "/question/outputStatement.md"
//             );
//             let rangeAndHint = ReadFile(
//               fileStoragePath + "/question/rangeAndHint.md"
//             );
//             if (
//               summary.success &&
//               background.success &&
//               description.success &&
//               inputStatement.success &&
//               outputStatement.success &&
//               rangeAndHint.success
//             ) {
//               fs.unlinkSync(fileStoragePath + "/question");
//               summary = summary.message.split(/\r?\n/);
//               insert_official_problem(
//                 id.toString(),
//                 summary[0],
//                 summary[1],
//                 summary[2],
//                 summary[3],
//                 summary[4],
//                 background.message,
//                 description.message,
//                 inputStatement.message,
//                 outputStatement.message,
//                 rangeAndHint.message,
//                 summary[5]
//               )
//                 .then((normalObj) => {
//                   if (normalObj.success) {
//                     let { arry, row } = decodeConfig(
//                       fileStoragePath + "/data/config.txt"
//                     );
//                     let norObj = InsertSamples(
//                       arry,
//                       1,
//                       row,
//                       id,
//                       fileStoragePath + "/data/"
//                     );
//                     if (norObj.success) {
//                       res.json({
//                         success: true,
//                         message: "题目创建成功",
//                       });
//                     } else {
//                       res.json({
//                         success: false,
//                         message: norObj.message,
//                       });
//                     }
//                   } else {
//                     res.json({
//                       success: false,
//                       message: normalObj.message,
//                     });
//                   }
//                 })
//                 .catch((errorObj) => {
//                   res.json(errorObj);
//                 });
//             } else {
//               res.json({
//                 success: false,
//                 message: "文件错误",
//               });
//             }
//           } else {
//             res.json({
//               success: false,
//               message: auth.message,
//             });
//           }
//         }
//       });
//     },
//     false
//   );
// }

// 创建题目
function problem_create(req, res, next) {
  validateFunction(
    req,
    res,
    next,
    async (req, res, next) => {
      // 从请求体获取数据
      let {
        cookie,
        id,
        title,
        titleEn,
        type,
        timeLimit,
        memoryLimit,
        background,
        statement,
        inputStatement,
        outputStatement,
        rangeAndHint,
        source,
      } = req.body;
      background = background ? background : "";

      // 验证管理员身份
      let cookie_verified = await authenticate_cookie(cookie, 1);
      if (!cookie_verified.success) {
        return cookie_verified;
      }

      // 将 data 压缩文件解压至 temp 目录下
      let extract_info = extractToTemp(req.file);
      if (!extract_info.success) {
        return extract_info;
      }

      // 检验 data 压缩文件目录格式是否符合要求
      let data_info = validate_data_zip_extract(extract_info.dir);
      if (!data_info.success) {
        // 若验证失败, 将临时文件删除
        fs.unlinkSync(extract_info.dir);
        return data_info;
      }

      // 根据 data 解析的结果更新数据库
      if (data_info.isSubtaskUsed) {
        for (let i = 1; i <= data_info.subtasks.length; i++) {
          let subtask_info = await insert_subtask(
            id,
            1,
            i,
            data_info.subtasks[i - 1].score
          );
          if (!subtask_info.success) {
            return subtask_info;
          }

          for (let j = 1; j <= data_info.subtasks.cases.length; j++) {
            let case_info = await insert_official_data(
              id,
              subtask_info.cases[j - 1].type ? "visible_sample" : "non_sample",
              i,
              j,
              data_info.subtasks.cases.input,
              data_info.subtasks.cases.output
            );
            if (!case_info.success) {
              return case_info;
            }
          }
          // for (let j = 1; j <= data_info.subtasks.)
        }
      } else {
      }

      // 问题配置的路径
      let problemDir = "./static/official_problem/" + id + "/problem";
      try {
        fs.mkdirSync(problemDir, { recursive: true });
      } catch (e) {
        return {
          success: false,
          message: "创建配置目录失败",
        };
      }

      // 写入各配置文件
      try {
        fs.writeFileSync(configDir + "/description.md", statement, "utf8");
        fs.writeFileSync(
          configDir + "/inputStatement.md",
          inputStatement,
          "utf8"
        );
        fs.writeFileSync(
          configDir + "/outputStatement.md",
          outputStatement,
          "utf8"
        );
        fs.writeFileSync(configDir + "/rangeAndHint.md", rangeAndHint, "utf8");
        fs.writeFileSync(
          configDir + "/summary.txt",
          title +
            "\n" +
            titleEn +
            "\n" +
            type +
            "\n" +
            timeLimit +
            "\n" +
            memoryLimit +
            (source == "" ? "" : "\n" + source),
          "utf8"
        );
      } catch (e) {
        return {
          success: false,
          message: "写入配置文件失败",
        };
      }
    },
    true
  );
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
      return insert_official_sample(
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
  console.log(formatedUUID);
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
