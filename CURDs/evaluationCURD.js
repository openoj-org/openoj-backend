/* 文件名: evaluationCURD.js
 * 功能: 对评测数据 evaluations 表的增删查改
 * 作者: niehy21
 * 最后更新时间: 2023/12/12
 */
const { randomUUID } = require("crypto");
const {
  select_one_decorator,
  select_multiple_decorator,
  insert_one_decorator,
  update_decorator,
  delete_decorator,
} = require("./decorator");

const fsExt = require("fs-extra");

function select_score_by_pid_and_uid(problem_id, user_id, problem_is_official) {
  let sql =
    "SELECT max(evaluation_score) AS score FROM evaluations WHERE \
               problem_id = ? AND user_id = ? AND problem_is_official = ?;";
  let sqlParams = [problem_id, Number(user_id), Number(problem_is_official)];
  return select_one_decorator(sql, sqlParams, "最高评测分数");
}

function select_official_score_by_pid_and_uid(problem_id, user_id) {
  return select_score_by_pid_and_uid(problem_id, user_id, 1);
}

function select_workshop_score_by_pid_and_uid(problem_id, user_id) {
  return select_score_by_pid_and_uid(problem_id, user_id, 0);
}

// 根据某一参数排序查询用户列表，返回第 start 至 end 个结果组成的列表
async function select_evaluations_by_param_order(
  order,
  increase,
  problemType,
  problemId,
  problemKeyword,
  userId,
  userKeyword,
  language,
  status,
  start,
  end
) {
  let mainStr1 =
    "SELECT e.evaluation_id AS id, \
  e.problem_is_official AS type, \
  e.problem_id AS problemId, \
  p.problem_name AS problemTitle, \
  e.user_id AS userId, \
  u.user_name AS username, \
  e.evaluation_language AS language, \
  e.evaluation_submit_time AS time, \
  e.evaluation_status AS status, \
  e.evalaution_score AS score, \
  e.evaluation_total_time AS timeCost, \
  e.evaluation_total_memory AS memoryCost \
  FROM evaluations AS e \
  INNER JOIN problems AS p \
  ON e.problem_id = p.problem_id \
  INNER JOIN users AS u \
  ON e.user_id = u.user_id ";

  let mainStr2 =
    "SELECT CONUT(*) AS count FROM evaluations AS e \
  INNER JOIN problems AS p \
  ON e.problem_id = p.problem_id \
  INNER JOIN users AS u \
  ON e.user_id = u.user_id ";

  let sqlParams1 = [],
    sqlParams2 = [];

  // WHERE 子句拼接的字符串
  let whereStr = "";

  // WHERE 子句列表
  let whereArr = [];

  // 依次检查可选参数
  for (const queryObj of [
    { param: 1 - Number(problemType), query: "e.problem_is_official = ?" },
    { param: problemId, query: "e.problem_id = ?" },
    { param: "%" + problemKeyword + "%", query: "p.problem_name LIKE ?" },
    { param: Number(userId), query: "e.user_id = ?" },
    { param: "%" + userKeyword + "%", query: "u.user_name LIKE ?" },
    { param: language, query: "e.evaluation_language = ?" },
    { param: status, query: "e.evaluation_status = ?" },
  ]) {
    // 若参数存在, 则将查询语句和参数分别加入对应数组中
    if (queryObj.param !== null) {
      whereArr.push(queryObj.query);
      sqlParams1.push(queryObj.param);
      sqlParams2.push(queryObj.param);
    }
  }

  // 将 WHERE 子句连接为查询字符串中的 WHERE 部分
  if (whereArr.length > 0) {
    whereStr += "WHERE " + whereArr[0];
    for (var i = 1; i < whereArr.length; i++) {
      whereStr += " AND " + whereArr[i];
    }
    whereStr += " ";
  }

  // 排序的字符串
  let orderStr = ((ord, inc) => {
    let ret = {
      time: "ORDER BY e.evaluation_submit_time ",
      score: "ORDER BY e.evalaution_score ",
      timeCost: "ORDER BY e.evaluation_total_time ",
      memoryCost: "ORDER BY e.evaluation_total_memory ",
    }[ord];
    return ret ? ret + (inc ? "ASC " : "DESC ") : "";
  })(order, increase);

  // 限制范围的字符串
  let limitStr = ";";

  // 若有范围参数, 对范围进行限制
  if (start != null && end != null) {
    limitStr = "LIMIT ?, ?;";
    sqlParams1.push(Number(start));
    sqlParams1.push(Number(end) - Number(start) + 1);
  }

  // SQL 查询语句拼接和查询
  let sql1 = mainStr1 + whereStr + orderStr + limitStr;
  let evaluations = select_multiple_decorator(sql1, sqlParams1, "评测列表");
  if (!evaluations.success) {
    return evaluations;
  }
  let sql2 = mainStr2 + whereStr;
  let count = select_one_decorator(sql2, sqlParams2, "评测数量");
  if (!count.success) {
    return count;
  }

  // 处理查询结果
  evaluations.count = count.result.count;
  return evaluations;
}

/**
 * 新的增添一条评测记录的函数
 * @date 2023/12/21 - 13:52:32
 * @author Mr_Spade
 *
 * @param {*} problemType 0：官方题库，1：创意工坊
 * @param {*} problemId 题目id
 * @param {*} userId 提交的用户的id
 * @param {*} language 提交的语言，C++11|Python3
 * @param {*} sourceCode 提交的源代码
 *
 * 函数的result返回一个对象，id的键值表示插入的evaluation的id
 *
 * 函数需要在数据表evaluation中保存一条记录，保存的值包括evaluation_id、problem_is_official、problem_id、user_id、evaluation_language。
 * 同时，evaluation_source_filename需要数据库自行将源代码内容保存在由数据库指定的文件中，并保存文件路径；evaluation_submit_time根据调用函数的时间存储一个时间戳
 * evaluation_score、evaluation_status、evaluation_total_time、evaluation_total_memory为评测结果，暂时先存为NULL，表示还没有结果
 */
async function insert_evaluation(
  problemType,
  problemId,
  userId,
  language,
  sourceCode
) {
  let sourceFile =
    (problemType ? "workshop" : "official") +
    "_problem/" +
    problemId +
    "/" +
    userId +
    "/" +
    randomUUID();
  try {
    await fsExt.ensureFile("./static/evaluations/" + sourceFile);
    await fsExt.writeFile(sourceFile, sourceCode, "utf8");
    console.log("代码文件创建成功");
  } catch (err) {
    return {
      success: false,
      message: err.message,
    };
  }
  let sql =
    "INSERT INTO evaluations(\
    problem_is_official, \
    problem_id, \
    user_id, \
    evaluation_language, \
    evaluation_source_filename\
    ) VALUES(?, ?, ?, ?, ?);";
  let sqlParams = [
    Number(problemType),
    problemId,
    Number(userId),
    language,
    sourceFile,
  ];
  return insert_one_decorator(sql, sqlParams, "评测记录");
}

/**
 * 新增一条子任务的评测记录的函数
 * @date 2023/12/21 - 14:06:23
 * @author Mr_Spade
 *
 * @param {*} subtask_id 子任务对应的id
 * @param {*} evaluation_id 评测对应的id
 *
 * 函数的result返回一个对象，id的键值表示插入的subtask_evaluation的id
 *
 * 函数需要在数据表subtask_evaluation中保存一条记录，保存的值包括subtask_evaluation_id、subtask_id、evaluation_id。
 * subtask_evaluation_score、subtask_evaluation_status为评测结果，暂时先存为NULL，表示还没有结果
 */
function insert_subtask_evaluation(subtask_id, evaluation_id) {
  let sql =
    "INSERT INTO subtask_evaluations(\
    subtask_id, \
    evaluation_id\
    ) VALUES(?, ?);";
  let sqlParams = [Number(subtask_id), Number(evaluation_id)];
  return insert_one_decorator(sql, sqlParams, "子任务评测记录");
}

/**
 * 新增一条数据的评测记录的函数
 * @date 2023/12/21 - 14:06:23
 * @author Mr_Spade
 *
 * @param {*} data_id 数据点对应的id
 * @param {*} evaluation_id 评测对应的id
 * @param {*} subtask_evaluation_id 如果本题采用了subtask，那么这一项为对应的subtask_evaluation的id，否则为null
 *
 * 函数的result返回一个对象，id的键值表示插入的data_evaluation的id
 *
 * 函数需要在数据表data_evaluation中保存一条记录，保存的值包括data_evaluation_id、data_id、evaluation_id、subtask_evaluation_id。
 * data_evaluation_score、data_evaluation_status、data_evaluation_time、data_evaluation_memory为评测结果，暂时先存为NULL，表示还没有结果
 */
function insert_data_evaluation(data_id, evaluation_id, subtask_evaluation_id) {
  let sql =
    "INSERT INTO data_evaluations(\
    data_id, \
    evaluation_id, \
    subtask_evaluation_id\
    ) VALUES(?, ?, ?);";
  let sqlParams = [
    Number(data_id),
    Number(evaluation_id),
    Number(subtask_evaluation_id),
  ];
  return insert_one_decorator(sql, sqlParams, "子任务评测记录");
}

/**
 * 根据id更新一条评测的结果
 * @date 2023/12/21 - 14:39:29
 * @author Mr_Spade
 *
 * @param {*} evaluation_id
 * @param {*} status
 * @param {*} score
 * @param {*} timeCost
 * @param {*} memoryCost
 */
function update_evaluation_result_by_id(
  evaluation_id,
  status,
  score,
  timeCost,
  memoryCost
) {
  let sql =
    "UPDATE evaluations SET " +
    "evaluation_status = ?, " +
    "evaluation_score = ?, " +
    "evaluation_total_time = ?, " +
    "evaluation_total_memory = ? " +
    "WHERE evaluation_id = ?;";
  let sqlParams = [
    status,
    Number(score),
    Number(timeCost),
    Number(memoryCost),
    Number(evaluation_id),
  ];
  return update_decorator(sql, sqlParams, "评测记录");
}

/**
 * 根据id更新一条数据评测的结果
 * @date 2023/12/21 - 14:47:26
 * @author Mr_Spade
 *
 * @param {*} data_evaluation_id
 * @param {*} status
 * @param {*} score
 * @param {*} timeCost
 * @param {*} memoryCost
 */
function update_data_evaluation_result_by_id(
  data_evaluation_id,
  status,
  score,
  timeCost,
  memoryCost
) {
  let sql =
    "UPDATE data_evaluations SET " +
    "data_evaluation_status = ?, " +
    "data_evaluation_score = ?, " +
    "data_evaluation_time = ?, " +
    "data_evaluation_memory = ? " +
    "WHERE data_evaluation_id = ?;";
  let sqlParams = [
    status,
    Number(score),
    Number(timeCost),
    Number(memoryCost),
    Number(data_evaluation_id),
  ];
  return update_decorator(sql, sqlParams, "评测记录");
}

/**
 * 根据id更新一条子任务评测的结果
 * @date 2023/12/21 - 14:47:26
 * @author Mr_Spade
 *
 * @param {*} subtask_evaluation_id
 * @param {*} status
 * @param {*} score
 * @param {*} timeCost
 * @param {*} memoryCost
 */
function update_subtask_evaluation_result_by_id(
  subtask_evaluation_id,
  status,
  score,
  timeCost,
  memoryCost
) {
  let sql =
    "UPDATE subtask_evaluations SET " +
    "subtask_evaluation_status = ?, " +
    "subtask_evaluation_score = ?, " +
    "subtask_evaluation_time = ?, " +
    "subtask_evaluation_memory = ? " +
    "WHERE subtask_evaluation_id = ?;";
  let sqlParams = [
    status,
    Number(score),
    Number(timeCost),
    Number(memoryCost),
    Number(data_evaluation_id),
  ];
  return update_decorator(sql, sqlParams, "评测记录");
}

/**
 * 根据id给出一项evaluation的若干信息
 * @date 2023/12/21 - 14:31:00
 * @author Mr_Spade
 *
 * @param {*} evaluation_id
 *
 * 若成功，返回的对象的result属性为结果，result的各个属性如下：
 * type：题目类型。0：官方题库，1：创意工坊
 * problemId：官方题库或创意工坊题目id
 * userId：用户id
 * language: 编程语言。目前仅支持“C++11”，“Python3”。
 * sourceCode：本提交的源代码
 * time：提交评测的时间
 * status：一个字符串表示评测状态，没有评测完就是null
 * score：如果评测结束，则给出评测的分数。如果是没有评测完，给出null
 * timeCost：该部分评测的用时（单位：毫秒），没评完给null
 * memoryCost：该部分评测的空间（单位：MB），没评完给null
 */
async function select_evaluation_by_id(evaluation_id) {
  let sql =
    "SELECT (1 - e.problem_is_official) AS type, " +
    "problem_id AS problemId, " +
    "user_id AS userId, " +
    "evaluation_language AS language, " +
    "evaluation_source_filename AS sourceFile, " +
    "evaluation_total_time AS timeCost, " +
    "evaluation_total_memory AS memoryCost, " +
    "evaluation_submit_time AS time, " +
    "eavluation_status AS status, " +
    "evaluation_score AS score " +
    "WHERE evaluation_id = ?;";
  let sqlParams = [evaluation_id];
  let evalaution_info = await select_one_decorator(sql, sqlParams, "评测记录");
  if (!evalaution_info.success) {
    return evalaution_info;
  }

  // 通过源代码路径读取内容, 将代码附加到结果
  try {
    evalaution_info.result.sourceCode = await fsExt.readFile(
      "./static/evaluations/" + evalaution_info.result.sourceFile,
      "utf8"
    );
  } catch (e) {
    return {
      success: false,
      message: e.message,
    };
  }

  if (evalaution_info.result.status == null) {
    evalaution_info.result.timeCost =
      evalaution_info.result.memoryCost =
      evalaution_info.result.score =
        null;
  }

  return evalaution_info;
}

/**
 * 根据id给出一项subtask_evaluation的若干信息
 * @date 2023/12/21 - 14:31:00
 * @author Mr_Spade, niehy21
 *
 * @param {*} subtask_evaluation_id
 *
 * 若成功，返回的对象的result属性为结果，result的各个属性如下：
 * status：一个字符串表示评测状态，没有评测完就是null
 * score：如果评测结束，则给出评测的分数。如果是属于子任务的数据点，则是没有分数的，给出null
 * timeCost：该部分评测的用时（单位：毫秒），没评完给null
 * memoryCost：该部分评测的空间（单位：MB），没评完给null
 */
function select_subtask_evaluation_by_id(subtask_evaluation_id) {
  let sql =
    "SELECT subtask_evaluation_status AS status, " +
    "subtask_evaluation_score AS score, " +
    "subtask_evaluation_time AS timeCost, " +
    "subtask_evaluation_memory AS memoryCost " +
    "WHERE subtask_evaluation_id = ?;";
  let sqlParams = [subtask_evaluation_id];
  return select_one_decorator(sql, sqlParams, "子任务评测记录");
}

/**
 * 根据id给出一项data_evaluation的若干信息
 * @date 2023/12/21 - 14:31:00
 * @author Mr_Spade, niehy21
 *
 * @param {*} data_evaluation_id
 *
 * 若成功，返回的对象的result属性为结果，result的各个属性如下：
 * data_id: 数据评测对应的数据的id
 * status：一个字符串表示评测状态，没有评测完就是null
 * score：如果评测结束，则给出评测的分数。如果是属于子任务的数据点，则是没有分数的，给出null
 * timeCost：该部分评测的用时（单位：毫秒），没评完给null
 * memoryCost：该部分评测的空间（单位：MB），没评完给null
 */
function select_data_evaluation_by_id(data_evaluation_id) {
  let sql =
    "SELECT data_id, " +
    "data_evaluation_status AS status, " +
    "data_evaluation_score AS score, " +
    "data_evaluation_time AS timeCost, " +
    "data_evaluation_memory AS memoryCost " +
    "WHERE data_evaluation_id = ?;";
  let sqlParams = [data_evaluation_id];
  return select_one_decorator(sql, sqlParams, "数据点评测记录");
}

/**
 * 根据evaluation_id获取对应评测记录的evaluation_received_id
 * @date 2023/12/21 - 14:24:30
 * @author Mr_Spade, niehy21
 *
 * @param {*} evaluation_id
 *
 * 函数的result返回一个对象，received_id的键值表示对应的结果
 */
function select_evaluation_received_id_by_id(evaluation_id) {
  let sql =
    "SELECT evaluation_received_id AS received_id " +
    "FROM data_evaluations " +
    "WHERE evaluation_id = ?;";
  let sqlParams = [evaluation_id];
  return select_one_decorator(sql, sqlParams, "评测机方评测记录");
}

/**
 * 根据evaluation_id获取对应评测记录的所有data_evaluation组成的列表，按照样例顺序升序排序
 * @date 2023/12/21 - 14:59:12
 * @author Mr_Spade, niehy21
 *
 * @param {*} evaluation_id
 *
 * 若成功，返回的对象的result属性为结果，result的各个属性如下：
 * id：数据评测的id
 * status：一个字符串表示评测状态，没有评测完就是null
 * score：如果评测结束，则给出评测的分数。如果是属于子任务的数据点，则是没有分数的，给出null
 * timeCost：该部分评测的用时（单位：毫秒），没评完给null
 * memoryCost：该部分评测的空间（单位：MB），没评完给null
 */
async function select_data_evaluation_by_evaluation_id(evaluation_id) {
  let sql =
    "SELECT data_evaluation_id AS id, " +
    "data_evaluation_status AS status, " +
    "data_evaluation_score AS score, " +
    "data_evaluation_time AS timeCost, " +
    "data_evaluation_memory AS memoryCost " +
    "FROM data_evaluations " +
    "WHERE evaluation_id = ?;";
  let sqlParams = [Number(evaluation_id)];
  let selected = select_multiple_decorator(sql, sqlParams, "数据点评测记录");
  if (!selected.success) {
    return selected;
  } else {
    selected.result.forEach((obj) => {
      if (obj.status == null) {
        obj.score = obj.timeCost = obj.memoryCost = null;
      }
    });
  }
}

/**
 * 根据evaluation_id获取对应评测记录的所有subtask_evaluation组成的列表，按照子任务顺序升序排序
 * @date 2023/12/21 - 14:59:12
 * @author Mr_Spade, niehy21
 *
 * @param {*} evaluation_id
 *
 * 若成功，返回的对象的result属性为结果，是一个列表，列表中每个元素的各个属性如下：
 * id：子任务评测的id
 * status：一个字符串表示评测状态，没有评测完就是null
 * score：如果评测结束，则给出评测的分数。如果是属于子任务的数据点，则是没有分数的，给出null
 * timeCost：该部分评测的用时（单位：毫秒），没评完给null
 * memoryCost：该部分评测的空间（单位：MB），没评完给null
 */
async function select_subtask_evaluation_by_evaluation_id(evaluation_id) {
  let sql =
    "SELECT subtask_evaluation_id AS id, " +
    "subtask_evaluation_status AS status, " +
    "subtask_evaluation_score AS score, " +
    "subtask_evaluation_time AS timeCost, " +
    "subtask_evaluation_memory AS memoryCost " +
    "WHERE evaluation_id = ?;";
  let sqlParams = [Number(evaluation_id)];
  let selected = select_multiple_decorator(sql, sqlParams, "数据点评测记录");
  if (selected.success) {
    selected.result.forEach((obj) => {
      if (obj.status == null) {
        obj.score = obj.timeCost = obj.memoryCost = null;
      }
    });
  }
  return selected;
}

/**
 * 根据subtask_evaluation_id获取对应评测记录的所有data_evaluation组成的列表，按照样例顺序升序排序
 * @date 2023/12/21 - 14:59:12
 * @author Mr_Spade, niehy21
 *
 * @param {*} subtask_evaluation_id
 *
 * 若成功，返回的对象的result属性为结果，result是一个列表，列表中每个元素的各个属性如下：
 * id：数据评测的id
 * status：一个字符串表示评测状态，没有评测完就是null
 * score：如果评测结束，则给出评测的分数。如果是属于子任务的数据点，则是没有分数的，给出null
 * timeCost：该部分评测的用时（单位：毫秒），没评完给null
 * memoryCost：该部分评测的空间（单位：MB），没评完给null
 */
async function select_data_evaluation_by_subtask_evaluation_id(
  subtask_evaluation_id
) {
  let sql =
    "SELECT data_evaluation_id AS id, " +
    "data_evaluation_status AS status, " +
    "data_evaluation_score AS score, " +
    "data_evaluation_time AS timeCost, " +
    "data_evaluation_memory AS memoryCost " +
    "WHERE subtask_evaluation_id = ?;";
  let sqlParams = [Number(subtask_evaluation_id)];
  let selected = await select_multiple_decorator(
    sql,
    sqlParams,
    "数据点评测记录"
  );
  if (selected.success) {
    selected.result.forEach((obj) => {
      if (obj.status == null) {
        obj.score = obj.timeCost = obj.memoryCost = null;
      }
    });
  }
  return selected;
}

/**
 * 根据题目id，查找它的所有evaluation的信息，只需要一个属性
 * @date 2023/12/23 - 17:15:19
 * @author Mr_Spade, niehy21
 *
 * @param {*} problem_id
 * @param {*} problem_is_official
 *
 * 返回值有一个result属性，是一个数组，数组里的每一个元素描述一个属于该题目的评测记录，包含属性为：
 * id：评测id
 */
function select_evaluations_by_problem_id(problem_id, problem_is_official) {
  let sql =
    "SELECT evaluation_id AS id " +
    "FROM evaluations " +
    "WHERE problem_id = ? " +
    "AND problem_is_official = ?;";
  let sqlParams = [problem_id, problem_is_official ? 1 : 0];
  return select_multiple_decorator(sql, sqlParams, "评测记录");
}

/**
 * 根据评测id，删除所有属于这个评测的data_evaluation
 * @date 2023/12/23 - 17:20:16
 * @author Mr_Spade, niehy21
 *
 * @param {*} evaluation_id
 */
function delete_data_evaluation_by_evaluation_id(evaluation_id) {
  let sql = "DELETE FROM data_evaluations WHERE evaluation_id = ?;";
  let sqlParams = [Number(evaluation_id)];
  return delete_decorator(sql, sqlParams, "数据点评测记录");
}

/**
 * 根据评测id，删除所有属于这个评测的subtask_evaluation
 * @date 2023/12/23 - 17:20:16
 * @author Mr_Spade, niehy21
 *
 * @param {*} evaluation_id
 */
function delete_subtask_evaluation_by_evaluation_id(evaluation_id) {
  let sql = "DELETE FROM subtask_evaluations WHERE evaluation_id = ?;";
  let sqlParams = [Number(evaluation_id)];
  return delete_decorator(sql, sqlParams, "子任务评测记录");
}

module.exports = {
  /* 参数: problem_id,      // int, 官方题目 id
   * 　　  user_id          // int, 评测用户 id
   * 作用: 返回某用户官方题目最高评测分数查询的结果 {
   * 　　      // 以下为必有项
   * 　　      success,         // bool, 查询是否成功
   * 　　      message,         // string, 返回的消息
   * 　　      // 以下为 success = true 时存在项
   * 　　      score            // int, 评测分数
   * 　　  } 的 Promise 对象
   */
  select_official_score_by_pid_and_uid,

  /* 参数: problem_id,      // int, 表示工坊题目 id
   * 　　  user_id          // int, 表示评测用户 id
   * 作用: 返回某用户工坊题目最高评测分数查询的结果 {
   * 　　      // 以下为必有项
   * 　　      success,         // bool, 查询是否成功
   * 　　      message,         // string, 返回的消息
   * 　　      // 以下为 success = true 时存在项
   * 　　      score            // int, 评测分数
   * 　　  } 的 Promise 对象
   */
  select_workshop_score_by_pid_and_uid,

  /* 参数: order,           // string, 排序依据
   * 　　  increase,        // bool, 递 增/减
   * 　　  problemType,     // int, 题目类型 (可选)
   * 　　  problemId,       // int, 题目 id (可选)
   * 　　  problemKeyword,  // string, 题目标题含关键词 (可选)
   * 　　  userId,          // int, 用户 id (可选)
   * 　　  userKeyword,     // string, 用户名含关键词 (可选)
   * 　　  language,        // string, 评测语言 (可选)
   * 　　  status,          // string, 评测状态 (可选)
   * 　　  start,           // int, 评测结果列表首项下标
   * 　　  end              // int, 评测结果列表尾项下标
   * 作用: 返回某用户工坊题目最高评测分数查询的结果 {
   * 　　      // 以下为必有项
   * 　　      success,         // bool, 查询是否成功
   * 　　      message,         // string, 返回的消息
   * 　　      // 以下为 success = true 时存在项
   * 　　      result,          // array, 评测列表
   * 　　       -> result[i]        // object, 评测信息 {
   * 　　              id,              // int, 评测 id
   * 　　              problemId,       // int, 题目 id
   * 　　              problemTitle,    // string, 题目标题
   * 　　              userId,          // int, 用户 id
   * 　　              username,        // string, 用户名
   * 　　              language,        // string, 评测语言
   * 　　              time,            // datetime, 提交评测时间
   * 　　              status,          // string, 评测状态
   * 　　              score,           // int, 评测分数
   * 　　              timeCost,        // int, 评测所耗时间
   * 　　              memoryCost       // int, 评测所耗空间
   * 　　          }
   * 　　      count            // int, 评测结果数
   * 　　  } 的 Promise 对象
   */
  select_evaluations_by_param_order,

  /* 参数: problemId,       // int, 题目 id
   * 　　  userId,          // int, 用户
   * 　　  type,            // int, 题目类型
   * 　　  language         // string, 评测语言
   * 作用: 返回某用户添加官方评测的结果 {
   * 　　      // 以下为必有项
   * 　　      success,         // bool, 查询是否成功
   * 　　      message,         // string, 返回的消息
   * 　　      // 以下为 success = true 时存在项
   * 　　      id               // int, 插入的评测 id
   * 　　  } 的 Promise 对象
   */
  insert_evaluation,

  insert_subtask_evaluation,

  insert_data_evaluation,

  select_evaluation_by_id,

  select_subtask_evaluation_by_id,

  select_data_evaluation_by_id,

  select_evaluation_received_id_by_id,

  select_data_evaluation_by_evaluation_id,

  select_subtask_evaluation_by_evaluation_id,

  select_data_evaluation_by_subtask_evaluation_id,

  update_evaluation_result_by_id,

  update_data_evaluation_result_by_id,

  update_subtask_evaluation_result_by_id,

  /* 参数: problemId,       // int, 题目 id
   * 　　  userId,          // int, 用户
   * 　　  type,            // int, 题目类型
   * 　　  language         // string, 评测语言
   * 作用: 返回某用户添加官方评测的结果 {
   * 　　      // 以下为必有项
   * 　　      success,         // bool, 查询是否成功
   * 　　      message,         // string, 返回的消息
   * 　　      // 以下为 success = true 时存在项
   * 　　      id               // int, 插入的评测 id
   * 　　  } 的 Promise 对象
   */
  //update_evaluation,

  //select_evaluation_by_id,

  //select_subtask_evaluation_by_id,

  //select_sample_evaluation_by_id
  select_evaluations_by_problem_id,

  delete_data_evaluation_by_evaluation_id,

  delete_subtask_evaluation_by_evaluation_id,
};
