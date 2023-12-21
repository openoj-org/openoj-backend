/* 文件名: evaluationCURD.js
 * 功能: 对评测数据 evaluations 表的增删查改
 * 作者: niehy21
 * 最后更新时间: 2023/12/12
 */
const {
  select_one_decorator,
  select_multiple_decorator,
  insert_one_decorator,
} = require("./decorator");

function select_score_by_pid_and_uid(problem_id, user_id, problem_is_official) {
  let sql =
    "SELECT max(evaluation_score) AS score FROM evaluations WHERE \
               problem_id = ? AND user_id = ? AND problem_is_official = ?;";
  let sqlParams = [problem_id, user_id, problem_is_official];
  return select_one_decorator(sql, sqlParams, "最高评测分数");
}

function select_official_score_by_pid_and_uid(problem_id, user_id) {
  return select_score_by_pid_and_uid(problem_id, user_id, 1);
}

function select_workshop_score_by_pid_and_uid(problem_id, user_id) {
  return select_score_by_pid_and_uid(problem_id, user_id, 0);
}

// 需要更新一下结果中count的获取
function select_evaluations_by_param_order(
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
  // SQL 查询语句和参数列表
  let sql = "";
  let sqlParams = [];

  // 查询语句确定被查表和查询结果的主要部分
  // 通过内连接完成多表信息查询
  let mainStr =
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

  // WHERE 子句拼接的字符串
  let whereStr = "";

  // WHERE 子句列表
  let whereArr = [];

  // 依次检查可选参数
  for (const queryObj of [
    { param: problemType, query: "e.problem_is_official = ?" },
    { param: problemId, query: "e.problem_id = ?" },
    { param: problemKeyword, query: "p.problem_name LIKE %?%" },
    { param: userId, query: "e.user_id = ?" },
    { param: userKeyword, query: "u.user_name LIKE %?%" },
    { param: language, query: "e.evaluation_language = ?" },
    { param: status, query: "e.evaluation_status = ?" },
  ]) {
    // 若参数存在, 则将查询语句和参数分别加入对应数组中
    if (queryObj.param !== null) {
      whereArr.push(queryObj.query);
      sqlParams.push(queryObj.param);
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
    sqlParams.push(start);
    sqlParams.push(end);
  }

  // SQL 查询语句拼接
  // TODO: 补充一下count，注意count是不包括start、end限制的情况下，结果的数量，不是包括start、end的限制后结果的数量
  sql = mainStr + whereStr + orderStr + limitStr;
  return select_multiple_decorator(sql, sqlParams, "评测列表");
}

// 感觉这个函数实现不太完全，先注释掉，按照下面的重新实现一个
// TODO
// function insert_evaluation(problemId, userId, type, language) {
//   let sql =
//     "INSERT INTO evaluations(problem_id, user_id, \
//                problem_is_official, evaluation_language) \
//                VALUES(?, ?, ?, ?);";
//   let sqlParams = [problemId, userId, type, language];
//   return insert_one_decorator(sql, sqlParams, "样例");
// }

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
function insert_evaluation(
  problemType,
  problemId,
  userId,
  language,
  sourceCode
) {
  // TODO
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
  // TODO
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
  // TODO
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
  // TODO
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
  // TODO
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
  // TODO
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
 * score：如果评测结束，则给出评测的分数。如果是属于子任务的数据点，则是没有分数的，给出null
 * timeCost：该部分评测的用时（单位：毫秒），没评完给null
 * memoryCost：该部分评测的空间（单位：MB），没评完给null
 */
function select_evaluation_by_id(evaluation_id) {
  // TODO
}

/**
 * 根据evaluation_id获取对应评测记录的evaluation_received_id
 * @date 2023/12/21 - 14:24:30
 * @author Mr_Spade
 *
 * @param {*} evaluation_id
 *
 * 函数的result返回一个对象，received_id的键值表示对应的结果
 */
function select_evaluation_received_id_by_id(evaluation_id) {
  // TODO
}

/**
 * 根据evaluation_id获取对应评测记录的所有data_evaluation组成的列表，按照样例顺序升序排序
 * @date 2023/12/21 - 14:59:12
 * @author Mr_Spade
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
function select_data_evaluation_by_evaluation_id(evaluation_id) {
  // TODO
}

/**
 * 根据evaluation_id获取对应评测记录的所有subtask_evaluation组成的列表，按照子任务顺序升序排序
 * @date 2023/12/21 - 14:59:12
 * @author Mr_Spade
 *
 * @param {*} evaluation_id
 *
 * 若成功，返回的对象的result属性为结果，result的各个属性如下：
 * id：子任务评测的id
 * status：一个字符串表示评测状态，没有评测完就是null
 * score：如果评测结束，则给出评测的分数。如果是属于子任务的数据点，则是没有分数的，给出null
 * timeCost：该部分评测的用时（单位：毫秒），没评完给null
 * memoryCost：该部分评测的空间（单位：MB），没评完给null
 */
function select_subtask_evaluation_by_evaluation_id(evaluation_id) {
  // TODO
}

/**
 * 根据subtask_evaluation_id获取对应评测记录的所有data_evaluation组成的列表，按照样例顺序升序排序
 * @date 2023/12/21 - 14:59:12
 * @author Mr_Spade
 *
 * @param {*} subtask_evaluation_id
 *
 * 若成功，返回的对象的result属性为结果，result的各个属性如下：
 * id：数据评测的id
 * status：一个字符串表示评测状态，没有评测完就是null
 * score：如果评测结束，则给出评测的分数。如果是属于子任务的数据点，则是没有分数的，给出null
 * timeCost：该部分评测的用时（单位：毫秒），没评完给null
 * memoryCost：该部分评测的空间（单位：MB），没评完给null
 */
function select_data_evaluation_by_subtask_evaluation_id(
  subtask_evaluation_id
) {
  // TODO
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
};
