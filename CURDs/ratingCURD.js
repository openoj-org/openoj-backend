/* 文件名: ratingCURD.js
 * 功能: 对评分数据 ratings 表的增删查改
 * 作者: niehy21
 * 最后更新时间: 2023/12/14
 */
const { modifySql } = require("../utils");
const {
  select_one_decorator,
  insert_one_decorator,
  delete_decorator,
} = require("./decorator");

// TODO: 此处可能出现之前没有过评分的情况，这时请在result属性内的rating属性设置为null或者undefined
function select_rating_by_pid_and_uid(
  problem_id,
  user_id,
  problem_is_official
) {
  let sql =
    "SELECT rating_value AS rating FROM ratings WHERE \
               problem_id = ? AND rating_submit_user_id = ? AND problem_is_official = ?;";
  let sqlParams = [problem_id, user_id, problem_is_official];
  return select_one_decorator(sql, sqlParams, "评分");
}

function select_official_rating_by_pid_and_uid(problem_id, user_id) {
  return select_rating_by_pid_and_uid(problem_id, user_id, 1);
}

function select_workshop_rating_by_pid_and_uid(problem_id, user_id) {
  return select_rating_by_pid_and_uid(problem_id, user_id, 0);
}

function insert_rating(problem_id, user_id, rating, problem_is_official) {
  let sql =
    "INSERT INTO ratings(problem_id, rating_submit_user_id, \
               rating_value, problem_is_official) VALUES(?, ?, ?, ?);";
  let sqlParams = [problem_id, user_id, rating, problem_is_official];
  return insert_one_decorator(sql, sqlParams, "评分");
}

function insert_official_rating(problem_id, user_id, rating) {
  return insert_rating(problem_id, user_id, rating, 1);
}

function insert_workshop_rating(problem_id, user_id, rating) {
  return insert_rating(problem_id, user_id, rating, 0);
}

function delete_rating(problem_id, user_id, problem_is_official) {
  let sql =
    "DELETE FROM ratings WHERE problem_id \
               = ? AND rating_submit_user_id = ? AND problem_is_official = ?;";
  let sqlParams = [problem_id, user_id, problem_is_official ? 1 : 0];
  return delete_decorator(sql, sqlParams, "评分");
}

function delete_official_rating(problem_id, user_id) {
  return delete_rating(problem_id, user_id, 1);
}

function delete_workshop_rating(problem_id, user_id) {
  return delete_rating(problem_id, user_id, 0);
}

/**
 * 根据pid删除所有相关的rating
 * @date 2023/12/23 - 17:27:46
 * @author Mr_Spade
 *
 * @param {*} problem_id
 * @param {*} problem_is_official
 */
function delete_rating_by_pid(problem_id, problem_is_official) {
  let sql =
    "DELETE FROM ratings WHERE problem_id = ? AND problem_is_official = ?;";
  let sqlParams = [problem_id, problem_is_official ? 1 : 0];
  return delete_decorator(sql, sqlParams, "难度");
}

/**
 * 根据pid和uid获取用户是否进行了推荐
 * @date 2023/12/21 - 17:43:19
 * @author Mr_Spade
 *
 * @param {*} problem_id 创意工坊题目id（注意这里不可能是官方题库）
 * @param {*} user_id
 * @param {*} problem_is_official
 *
 * 返回的result属性是结果，有一个recommend属性，为true表示推荐过，为false表示没有推荐过
 */
async function select_recommendation_by_pid_and_uid(problem_id, user_id) {
  try {
    let sql =
      "SELECT COUNT(*) FROM recommendations WHERE problem_id = ? AND recommendation_submit_user_id = ?;";
    let sqlParams = [problem_id, user_id];
    const tmp = await modifySql(sql, sqlParams);
    return { success: true, result: { recommend: tmp[0]["COUNT(*)"] > 0 } };
  } catch (e) {
    return { success: false, message: "查询用户推荐出错" };
  }
}

/**
 * 根据pid和uid插入一个推荐，注意，如果之前已经有过相同的pid和uid的推荐，则不进行任何操作
 * @date 2023/12/21 - 17:53:36
 * @author Mr_Spade
 *
 * @param {*} problem_id
 * @param {*} user_id
 */
async function insert_recommendation_by_pid_and_uid(problem_id, user_id) {
  try {
    let tmp = await select_recommendation_by_pid_and_uid(problem_id, user_id);
    if (tmp.success == false) return tmp;
    if (tmp.result.recommend == false) {
      let sql =
        "INSERT INTO recommendations(recommendation_submit_user_id, problem_id) VALUES(?, ?);";
      let sqlParams = [user_id, problem_id];
      await modifySql(sql, sqlParams);
      return { success: true };
    }
  } catch (e) {
    return { success: false, message: "插入用户推荐出错" };
  }
}

/**
 * 根据pid和uid删除一个推荐，注意，如果之前没有相同的pid和uid的推荐，则不进行任何操作
 * @date 2023/12/21 - 17:53:36
 * @author Mr_Spade
 *
 * @param {*} problem_id
 * @param {*} user_id
 */
async function delete_recommendation_by_pid_and_uid(problem_id, user_id) {
  try {
    let sql =
      "DELETE FROM recommendations WHERE recommendation_submit_user_id = ? AND problem_id = ?;";
    let sqlParams = [user_id, problem_id];
    await modifySql(sql, sqlParams);
    return { success: true };
  } catch (e) {
    return { success: false, message: "删除用户推荐出错" };
  }
}

/**
 * 根据pid删除所有相关推荐
 * @date 2023/12/21 - 17:53:36
 * @author Mr_Spade
 *
 * @param {*} problem_id
 */
async function delete_recommendation_by_pid(problem_id) {
  try {
    let sql = "DELETE FROM recommendations WHERE problem_id = ?;";
    let sqlParams = [problem_id];
    await modifySql(sql, sqlParams);
    return { success: true };
  } catch (e) {
    return { success: false, message: "删除推荐出错" };
  }
}

/**
 * 根据problem_id来插入若干个标签
 * @date 2023/12/21 - 17:58:28
 * @author Mr_Spade
 *
 * @param {*} id 题目id
 * @param {*} problem_is_official 是否是官方题库的题目
 * @param {*} tags 一个数组，数组中的每个元素是一个字符串，表示一个标签，例如["动态规划","贪心","数学"]
 */
async function insert_tags_by_id(id, problem_is_official, tags) {
  try {
    let sql =
      "INSERT INTO tags(tag_name, problem_id, problem_is_official) VALUES(?, ?, ?);";
    let sqlParams = ["", id, problem_is_official ? 1 : 0];
    for (let tag of tags) {
      sqlParams[0] = tag;
      await modifySql(sql, sqlParams);
    }
    return { success: true };
  } catch (e) {
    return { success: false, message: "添加标签出错" };
  }
}

/**
 * 根据problem_id删除一道题的所有的标签
 * @date 2023/12/21 - 17:59:51
 * @author Mr_Spade
 *
 * @param {*} id 题目id
 * @param {*} problem_is_official 是否是官方题库的题目
 */
async function delete_tags_by_id(id, problem_is_official) {
  try {
    let sql =
      "DELETE FROM tags WHERE problem_id = ? AND problem_is_official = ?;";
    let sqlParams = [id, problem_is_official ? 1 : 0];
    await modifySql(sql, sqlParams);
    return { success: true };
  } catch (e) {
    return { success: false, message: "删除标签出错" };
  }
}

module.exports = {
  /* 参数: problem_id,      // int, 官方题目 id
   * 　　  user_id          // int, 评测用户 id
   * 作用: 返回包含某用户官方题目评分查询结果 {
   * 　　      // 以下为必有项
   * 　　      success,         // bool, 查询是否成功
   * 　　      message,         // string, 返回的消息
   * 　　      // 以下为 success = true 时存在项
   * 　　      rating               // int, 评分
   * 　　  } 的 Promise 对象
   */
  select_official_rating_by_pid_and_uid,

  /* 参数: problem_id,      // int, 工坊题目 id
   * 　　  user_id          // int, 评测用户 id
   * 作用: 返回包含某用户工坊题目评分查询结果 {
   * 　　      // 以下为必有项
   * 　　      success,         // bool, 查询是否成功
   * 　　      message,         // string, 返回的消息
   * 　　      // 以下为 success = true 时存在项
   * 　　      rating               // int, 评分
   * 　　  } 的 Promise 对象
   */
  select_workshop_rating_by_pid_and_uid,

  /* 参数: problem_id,      // int, 官方题目 id
   * 　　  user_id,         // int, 评测用户 id
   * 　　  rating           // int, 评分
   * 作用: 返回包含某用户添加官方题目评分的结果 {
   * 　　      // 以下为必有项
   * 　　      success,         // bool, 添加是否成功
   * 　　      message,         // string, 返回的消息
   * 　　      // 以下为 success = true 时存在项
   * 　　      id                   // int, 生成的评分 id
   * 　　  } 的 Promise 对象
   */
  insert_official_rating,

  /* 参数: problem_id,      // int, 工坊题目 id
   * 　　  user_id,         // int, 评测用户 id
   * 　　  rating           // int, 评分
   * 作用: 返回包含某用户添加工坊题目评分的结果 {
   * 　　      // 以下为必有项
   * 　　      success,         // bool, 添加是否成功
   * 　　      message,         // string, 返回的消息
   * 　　      // 以下为 success = true 时存在项
   * 　　      id                   // int, 生成的评分 id
   * 　　  } 的 Promise 对象
   */
  insert_workshop_rating,

  /* 参数: problem_id,      // int, 官方题目 id
   * 　　  user_id          // int, 评测用户 id
   * 作用: 返回包含某用户删除官方题目评分的结果 {
   * 　　      // 以下为必有项
   * 　　      success,         // bool, 删除是否成功
   * 　　      message          // string, 返回的消息
   * 　　  } 的 Promise 对象
   */
  delete_official_rating,

  /* 参数: problem_id,      // int, 工坊题目 id
   * 　　  user_id          // int, 评测用户 id
   * 作用: 返回包含某用户删除工坊题目评分的结果 {
   * 　　      // 以下为必有项
   * 　　      success,         // bool, 删除是否成功
   * 　　      message          // string, 返回的消息
   * 　　  } 的 Promise 对象
   */
  delete_workshop_rating,

  select_recommendation_by_pid_and_uid,

  insert_recommendation_by_pid_and_uid,

  delete_recommendation_by_pid_and_uid,

  insert_tags_by_id,

  delete_tags_by_id,

  delete_recommendation_by_pid,

  delete_rating_by_pid,
};
