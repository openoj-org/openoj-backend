/* 文件名: ratingCURD.js
 * 功能: 对评分数据 ratings 表的增删查改
 * 作者: niehy21
 * 最后更新时间: 2023/12/14
 */
const { select_one_decorator, insert_one_decorator, delete_decorator } = require('./decorator');

function select_rating_by_pid_and_uid(problem_id, user_id, problem_is_official) {
    let sql = 'SELECT rating_value AS rating FROM ratings WHERE \
               problem_id = ? AND user_id = ? AND problem_is_official;';
    let sqlParams = [problem_id, user_id, problem_is_official];
    return select_one_decorator(sql, sqlParams, '评分');
}

function select_official_rating_by_pid_and_uid(problem_id, user_id) {
    return select_rating_by_pid_and_uid(problem_id, user_id, 1);
}

function select_workshop_rating_by_pid_and_uid(problem_id, user_id) {
    return select_rating_by_pid_and_uid(problem_id, user_id, 0);
}

function insert_rating(problem_id, user_id, rating, problem_is_official) {
    let sql = 'INSERT INTO ratings(problem_id, rating_submit_user_id, \
               rating_value, problem_is_official) VALUES(?, ?, ?, ?);';
    let sqlParams = [problem_id, user_id, rating, problem_is_official];
    return insert_one_decorator(sql, sqlParams, '评分');
}

function insert_official_rating(problem_id, user_id, rating) {
    return insert_rating(problem_id, user_id, rating, 1);
}

function insert_workshop_rating(problem_id, user_id, rating) {
    return insert_rating(problem_id, user_id, rating, 0);
}

function delete_rating(problem_id, user_id) {
    let sql = 'DELECT FROM ratings WHERE problem_id \
               = ? AND rating_submit_user_id = ?;';
    let sqlParams = [problem_id, user_id];
    return delete_decorator(sql, sqlParams, '评分');
}

function delete_official_rating(problem_id, user_id) {
    return delete_rating(problem_id, user_id, 1);
}

function delete_workshop_rating(problem_id, user_id) {
    return delete_rating(problem_id, user_id, 0);
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
    delete_workshop_rating

}