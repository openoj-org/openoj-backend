/* 文件名: evaluationCURD.js
 * 功能: 对评测数据 evaluations 表的增删查改
 * 作者: niehy21
 * 最后更新时间: 2023/12/12
 */
const {
    select_one_decorator,
    select_multiple_decorator,
    insert_one_decorator
} = require('./decorator');

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

function select_evaluations_by_param_order(
    order, increase, problemType, problemId, problemKeyword,
    userId, userKeyword, language, status, start, end
) {
    // SQL 查询语句和参数列表
    let sql = '';
    let sqlParams = [];

    // 查询语句确定被查表和查询结果的主要部分
    // 通过内连接完成多表信息查询
    let mainStr = 'SELECT e.evaluation_id AS id, \
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
                   ON e.user_id = u.user_id ';

    // WHERE 子句拼接的字符串
    let whereStr = '';

    // WHERE 子句列表
    let whereArr = [];

    // 依次检查可选参数
    for (const queryObj of [
        { param: problemType, query: 'e.problem_is_official = ?' },
        { param: problemId, query: 'e.problem_id = ?' },
        { param: problemKeyword, query: 'p.problem_name LIKE %?%' },
        { param: userId, query: 'e.user_id = ?' },
        { param: userKeyword, query: 'u.user_name LIKE %?%' },
        { param: language, query: 'e.evaluation_language = ?' },
        { param: status, query: 'e.evaluation_status = ?' }
    ]) {
        // 若参数存在, 则将查询语句和参数分别加入对应数组中
        if (queryObj.param !== null) {
            whereArr.push(queryObj.query);
            sqlParams.push(queryObj.param);
        }
    }

    // 将 WHERE 子句连接为查询字符串中的 WHERE 部分
    if (whereArr.length > 0) {
        whereStr += ('WHERE ' + whereArr[0]);
        for (var i = 1; i < whereArr.length; i++) {
            whereStr += (' AND ' + whereArr[i]);
        }
        whereStr += ' ';
    }

    // 排序的字符串
    let orderStr = ((ord, inc) => {
        let ret = {
            time: 'ORDER BY e.evaluation_submit_time ',
            score: 'ORDER BY e.evalaution_score ',
            timeCost: 'ORDER BY e.evaluation_total_time ',
            memoryCost: 'ORDER BY e.evaluation_total_memory '
        }[ord];
        return (ret ? (ret + (inc ? 'ASC ' : 'DESC ')) : '');
    })(order, increase);

    // 限制范围的字符串
    let limitStr = ';';

    // 若有范围参数, 对范围进行限制
    if (start != null && end != null) {
        limitStr = 'LIMIT ?, ?;'
        sqlParams.push(start);
        sqlParams.push(end);
    }

    // SQL 查询语句拼接
    sql = mainStr + whereStr + orderStr + limitStr;
    return select_multiple_decorator(sql, sqlParams, '评测列表');
}

function insert_evaluation(problemId, userId, type, language) {
    let sql = 'INSERT INTO evaluations(problem_id, user_id, \
               problem_is_official, evaluation_language) \
               VALUES(?, ?, ?, ?);';
    let sqlParams = [problemId, userId, type, language];
    return insert_one_decorator(sql, sqlParams, '样例');
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
}