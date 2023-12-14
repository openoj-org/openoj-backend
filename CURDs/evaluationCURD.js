/* 文件名: evaluationCURD.js
 * 功能: 对评测数据 evaluations 表的增删查改
 * 作者: niehy21
 * 最后更新时间: 2023/12/12
 */
const { select_one_decorator } = require('./decorator');

function select_score_by_pid_and_uid(problem_id, user_id, problem_is_official) {
    let sql = 'SELECT max(evaluation_score) AS score FROM evaluations WHERE \
               problem_id = ? AND user_id = ? AND problem_is_official = ?;';
    let sqlParams = [problem_id, user_id, problem_is_official];
    return select_one_decorator(sql, sqlParams, '最高评测分数');
}

function select_official_score_by_pid_and_uid(problem_id, user_id) {
    return select_score_by_pid_and_uid(problem_id, user_id, 1);
}

function select_workshop_score_by_pid_and_uid(problem_id, user_id) {
    return select_score_by_pid_and_uid(problem_id, user_id, 0);
}

module.exports = {

    /* 参数: problem_id,      // int, 表示官方题目 id
     * 　　  user_id          // int, 表示评测用户 id
	 * 作用: 返回包含表示某用户官方题目最高评测分数查询结果的一个对象 {
	 * 　　      // 以下为必有项
	 * 　　      success,         // bool, 表示查询是否成功
	 * 　　      message,         // string, 表示返回的消息
     * 　　      // 以下为 success = true 时存在项
     * 　　      score                // int, 表示评测分数
	 * 　　  } 的 Promise 对象
	 */
    select_official_score_by_pid_and_uid,


    /* 参数: problem_id,      // int, 表示工坊题目 id
     * 　　  user_id          // int, 表示评测用户 id
	 * 作用: 返回包含表示某用户工坊题目最高评测分数查询结果的一个对象 {
	 * 　　      // 以下为必有项
	 * 　　      success,         // bool, 表示查询是否成功
	 * 　　      message,         // string, 表示返回的消息
     * 　　      // 以下为 success = true 时存在项
     * 　　      score                // int, 表示评测分数
	 * 　　  } 的 Promise 对象
	 */
    select_workshop_score_by_pid_and_uid

}