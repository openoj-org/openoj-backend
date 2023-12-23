const { select_one_decorator } = require("./decorator");

const {
  querySql,
  queryOne,
  modifySql,
  toQueryString,
} = require("../utils/index");

function insert_post() {}

function update_post() {}

function select_post() {}

function select_post_by_param_order() {}
function insert_reply() {}
function select_reply_by_param_order() {}

/**
 * 根据题目id删除所有相关的评论
 * @date 2023/12/23 - 17:31:24
 * @author Mr_Spade
 *
 * @param {*} problem_id
 * @param {*} problem_is_official
 */
function delete_post_by_problem_id(problem_id, problem_is_official) {
  // TODO
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
function select_posts_by_problem_id(problem_id, problem_is_official) {
  // TODO
}

/**
 * 根据post id删除所有相关的回复
 * @date 2023/12/23 - 17:33:19
 * @author Mr_Spade
 *
 * @param {*} post_id
 */
function delete_reply_by_post_id(post_id) {
  // TODO
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
