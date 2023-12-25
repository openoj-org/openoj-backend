const { select_one_decorator, insert_one_decorator } = require("./decorator");

const {
  querySql,
  queryOne,
  modifySql,
  toQueryString,
} = require("../utils/index");

async function insert_post(title, type, problem_id, user_id, content) {
  try {
    let sql =
      "INSERT INTO posts(post_title, post_is_question_discussion, problem_id, post_submit_user_id, post_text) VALUES(?, ?, ?, ?, ?);";
    let sqlParams = [title, type, problem_id, user_id, content];
    return await insert_one_decorator(sql, sqlParams, "帖子");
  } catch (e) {
    return { success: false, message: "插入帖子失败" };
  }
}

function update_post() {}

async function select_post(id) {
  let sql =
    "SELECT post_title AS title, post_submit_user_id AS userId, post_time AS time, last_reply_time AS commentTime, post_is_question_discussion AS type, problem_id AS problemId, reply_number as count FROM posts WHERE post_id = ?;";
  let sqlParams = [id];
  const result = await modifySql(sql, sqlParams);
  if (result.length < 1) return { success: false, message: "帖子不存在" };
  return { success: true, result: result[0] };
}

async function select_post_by_param_order(
  order,
  increase,
  titleKeyword,
  authorId,
  authorKeyword,
  sourceType,
  sourceId,
  sourceKeyword,
  start,
  end
) {
  try {
    switch (order) {
      case "postTime":
        order = "post_time";
        break;
      case "commentTime":
        order = "last_reply_time";
        break;
    }
    let sql =
      "SELECT post_id AS id, post_title AS title, post_submit_user_id AS userId, post_time AS time, last_reply_time AS commentTime, post_is_question_discussion AS type, problem_id AS problemId, reply_number as count FROM posts WHERE ";
    let sqlParams = [];
    sql += "post_title LIKE ? ";
    sqlParams.push("%" + titleKeyword + "%");
    if (authorId != undefined) {
      sql += "AND post_submit_user_id = ? ";
      sqlParams.push(authorId);
    }
    if (sourceType != undefined) {
      sql += "AND post_is_question_discussion = ? ";
      sqlParams.push(sourceType == 0 ? 1 : 2);
      sql += "AND problem_id = ? ";
      sqlParams.push(sourceId);
    }
    sql += `ORDER BY ${order} ${increase ? "ASC" : "DESC"} `;
    sql += "LIMIT ?, ?;";
    sqlParams.push(start);
    sqlParams.push(end - start + 1);
    const result = await modifySql(sql, sqlParams);
    sql = "SELECT COUNT(*) FROM posts WHERE ";
    sqlParams = [];
    sql += "post_title LIKE ? ";
    sqlParams.push("%" + titleKeyword + "%");
    if (authorId != undefined) {
      sql += "AND post_submit_user_id = ? ";
      sqlParams.push(authorId);
    }
    if (sourceType != undefined) {
      sql += "AND post_is_question_discussion = ? ";
      sqlParams.push(sourceType == 0 ? 1 : 2);
      sql += "AND problem_id = ? ";
      sqlParams.push(sourceId);
    }
    sql += `ORDER BY ${order} ${increase ? "ASC" : "DESC"};`;
    const count = await modifySql(sql, sqlParams)[0]["COUNT(*)"];
    return { success: true, result: result, count: count };
  } catch (e) {
    return { success: false, message: "读取帖子列表时出错" };
  }
}
function insert_reply() {}

async function select_reply_by_param_order(post_id, start, end) {
  try {
    let sql =
      "SELECT reply_submit_user_id AS userId, reply_text AS content, reply_time AS time FROM replies WHERE post_id = ? LIMIT ?, ?;";
    let sqlParams = [post_id, start, end - start + 1];
    return { success: true, result: await modifySql(sql, sqlParams) };
  } catch (e) {
    return { success: true, message: "获取回复时出错" };
  }
}

/**
 * 根据题目id删除所有相关的评论
 * @date 2023/12/23 - 17:31:24
 * @author Mr_Spade
 *
 * @param {*} problem_id
 * @param {*} problem_is_official
 */
async function delete_post_by_problem_id(problem_id, problem_is_official) {
  try {
    let sql =
      "DELETE FROM posts WHERE problem_id = ? AND post_is_question_discussion = ?;";
    let sqlParams = [problem_id, problem_is_official ? 1 : 2];
    await modifySql(sql, sqlParams);
    return { success: true };
  } catch (e) {
    return { success: false, message: "删除帖子失败" };
  }
}

/**
 * 根据题目id返回一个列表，表示所有和本题目相关的帖子的信息，只需要id
 * @date 2023/12/23 - 17:34:06
 * @author Mr_Spade
 *
 * @param {*} problem_id
 * @param {*} problem_is_official
 *
 * 返回的值包含一个result属性，是一个数组，每个元素描述一个帖子，属性如下：
 * id: 帖子id
 */
async function select_posts_by_problem_id(problem_id, problem_is_official) {
  try {
    let sql =
      "SELECT post_id AS id FROM posts WHERE problem_id = ? AND post_is_question_discussion = ?;";
    let sqlParams = [problem_id, problem_is_official ? 1 : 2];
    const result = await modifySql(sql, sqlParams);
    return { success: true, result: result };
  } catch (e) {
    return { success: false, message: "获取帖子失败" };
  }
}

/**
 * 根据post id删除所有相关的回复
 * @date 2023/12/23 - 17:33:19
 * @author Mr_Spade
 *
 * @param {*} post_id
 */
async function delete_reply_by_post_id(post_id) {
  try {
    let sql = "DELETE FROM replies WHERE post_id = ?";
    let sqlParams = [post_id];
    await modifySql(sql, sqlParams);
    return { success: true };
  } catch (e) {
    return { success: false, message: "删除回复失败" };
  }
}

module.exports = {
  /* 参数: post_id		// 帖子id
   *		 title
   * 		 content
   *		 user_id
   *		 user_name
   *		 post_is_question_discussion
   *		 problem_id
   *		 problem_title
   *		 reply_count 	// 跟贴数量
   * 注意需生成时间，包括帖子的发表时间和最后跟帖时间
   * 返回: {
   * 　　  　　// 以下为必有项
   * 　　  　　success,       // bool, 表示添加是否成功
   * 　　  　　message,       // string, 表示返回的消息
   * 　　  } 的 Promise 对象
   */
  insert_post,

  /* 作用：仅用于跟帖后，更新帖子的跟贴数量和最后跟帖时间，跟贴数量+1，最后跟帖时间改为现在的时间
   * 参数：post_id
   * 返回：{
   * 　　  　　// 以下为必有项
   * 　　  　　success,       // bool, 表示更新是否成功
   * 　　  　　message,       // string, 表示返回的消息
   * 　　  } 的 Promise 对象
   */
  update_post,

  /* 作用：查询帖子的基本信息
   * 参数：post_id
   * 返回：{
   * 　　  　　// 以下为必有项
   * 　　  　　success,       // bool, 表示查询是否成功
   * 　　  　　message,       // string, 表示返回的消息
   * 			// 以下为 success = true 时存在项
   * 			title,
   * 			content,		// 帖子内容
   * 			user_id,		// 楼主id
   * 			user_name,
   * 			time,			// 发帖时间
   * 			comment_time	// 最后跟帖时间
   * 			type,			// 0：讨论，1：官方题库，2：创意工坊
   * 			problem_id,		// null or id
   * 			problem_title,	// null or title
   * 			count			// 跟贴数量
   * 　　  } 的 Promise 对象
   */
  select_post,

  // 参数与返回详见API /forum/list
  select_post_by_param_order,

  /* 参数: reply_id		// 回复id
   *		 post_id	    // 回复对应帖子id
   *		 reply_user_id
   *		 reply_user_name
   *		 content
   * 注意需生成时间
   * 返回: {
   * 　　  　　// 以下为必有项
   * 　　  　　success,       // bool, 表示查询是否成功
   * 　　  　　message,       // string, 表示返回的消息
   * 　　  } 的 Promise 对象
   */
  insert_reply,

  /* 我不确定 start 会不会等于0, 等于0是否需要返回楼主信息，如果要，麻烦你加到commentInfo里
   * 参数: post_id
   *		 start
   *		 end		// 发帖为第0条
   * 作用: 返回包含按【时间】排序的从start-end的跟帖列表查询结果的一个对象 {
   * 　　  　　// 以下为必有项
   * 　　  　　success,       // bool, 表示查询是否成功
   * 　　  　　message,       // string, 表示返回的消息
   * 　　  　　// 以下为 success = true 时存在项
   * 			commentInfo		// 	array {
   * 　　  　　	userId,
   *				username,
   *				content,
   *				time		//
   *			}
   * 　　  } 的 Promise 对象
   */
  select_reply_by_param_order,

  delete_post_by_problem_id,

  select_posts_by_problem_id,

  delete_reply_by_post_id,
};
