const { select_one_decorator } = require('./decorator');

const { querySql, queryOne, modifySql, toQueryString } = require('../utils/index');

/* 
 * 数据库 posts 需做如下修改方便后续查找
 * 增加 post_submit_user_name 楼主用户名
 * 增加 reply_comment_time 该楼的最后跟帖时间
 * 增加 reply_count 跟贴数量
 * 增加 problem_title 对应的题目标题or Null
 * 
 * 数据库 replies 需做如下修改方便后续查找
 * 增加 reply_submit_user_name 用户名
 * 
 * 在 problemCURD 中，增加
 * select_official_problem_title_by_id	// 通过题目id查找title
 * select_workshop_problem_title_by_id	// 通过题目id查找title
 */

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
};