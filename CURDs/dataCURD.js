/* 文件名: dataCURD.js
 * 功能: 对评测数据 evaluations 表的增删查改
 * 作者: niehy21
 * 最后更新时间: 2023/12/13
 */

const {
    insert_one_decorator,
    delete_decorator,
    select_multiple_decorator
} = require('./decorator');

function select_sample_by_problem_id(problem_id, problem_is_official) {
    let sql = 'SELECT data_id AS id, \
               data_attribute AS attribute, \
               data_input_filename AS input_filename, \
               data_output_filename AS output_filename \
               FROM data WHERE problem_id = ? \
               AND problem_is_official = ? \
               AND data_attribute != "non_sample";';
    let sqlParams = [problem_id, problem_is_official];
    return select_multiple_decorator(sql, sqlParams, '样例');
}

function select_official_sample_by_problem_id(problem_id) {
    return select_sample_by_problem_id(problem_id, 1);
}

function select_workshop_sample_by_problem_id(problem_id) {
    return select_sample_by_problem_id(problem_id, 0);
}

function select_data_by_problem_id(problem_id, problem_is_official) {
    let sql = 'SELECT data_id AS id, \
               data_attribute AS attribute, \
               data_input_filename AS input_filename, \
               data_output_filename AS output_filename \
               FROM data WHERE problem_id = ? \
               AND problem_is_official = ? \
               AND data_attribute = "non_sample";';
    let sqlParams = [problem_id, problem_is_official];
    return select_multiple_decorator(sql, sqlParams, '样例');
}

function select_official_data_by_problem_id(problem_id) {
    return select_data_by_problem_id(problem_id, 1);
}

function select_workshop_data_by_problem_id(problem_id) {
    return select_data_by_problem_id(problem_id, 0);
}

function insert_data(
    id, problem_id, problem_is_official, attribute, subtask_number,
    testpoint_number, input_filename, output_filename
) {
    let sql = 'INSERT INTO data(data_id, problem_id, \
               problem_is_official, data_attribute, \
               subtask_number, testpoint_number, \
               data_input_filename, data_output_filename) \
               VALUES(?, ?, ?, ?, ?, ?, ?, ?);';
    let sqlParams = [id, problem_id, (problem_is_official ? 1 : 0),
                     attribute, subtask_number, testpoint_number,
                     input_filename, output_filename];
    return insert_one_decorator(sql, sqlParams, '样例');
}

function insert_official_data(
    id, problem_id, attribute, subtask_number,
    testpoint_number, input_filename, output_filename
) {
    return insert_data(
        id, problem_id, 1, attribute, subtask_number,
        testpoint_number, input_filename, output_filename
    );
}

function insert_workshop_data(
    id, problem_id, attribute, subtask_number,
    testpoint_number, input_filename, output_filename
) {
    return insert_data(
        id, problem_id, 0, attribute, subtask_number,
        testpoint_number, input_filename, output_filename
    );
}

function delete_data_by_problem_id(problem_id, problem_is_official) {
    let sql = 'DELETE FROM data WHERE problem_id = ? \
               AND problem_is_official = ?;';
    let sqlParams = [problem_id, problem_is_official];
    return delete_decorator(sql, sqlParams, '样例');
}

function delete_official_data_by_problem_id(problem_id) {
    return delete_data_by_problem_id(problem_id, 1);
}

function delete_workshop_data_by_problem_id(problem_id) {
    return delete_data_by_problem_id(problem_id, 0);
}

module.exports = {
    
    /* 参数: problem_id       // int, 官方题目 id
	 * 作用: 返回官方题目的样例查询的结果 {
	 * 　　      // 以下为必有项
	 * 　　      success,         // bool, 查询是否成功
	 * 　　      message,         // string, 返回的消息
     * 　　      // 以下为 success = true 时存在项
     * 　　      result           // array, 题目样例的列表
	 * 　　       -> result[i]        // object, 单个样例 {
     * 　　              id,              // int, 样例 id
     * 　　              attribute,       // string, 样例属性
     * 　　              input_filename,  // string, 样例输入文件名
     * 　　              output_filename  // string, 样例输出文件名
     * 　　          }
	 * 　　  } 的 Promise 对象
	 */
    select_official_sample_by_problem_id,
    
    
    /* 参数: problem_id       // int, 工坊题目 id
	 * 作用: 返回工坊题目的样例查询的结果 {
	 * 　　      // 以下为必有项
	 * 　　      success,         // bool, 查询是否成功
	 * 　　      message,         // string, 返回的消息
     * 　　      // 以下为 success = true 时存在项
     * 　　      result           // array, 题目样例的列表
	 * 　　       -> result[i]        // object, 单个样例 {
     * 　　              id,              // int, 样例 id
     * 　　              attribute,       // string, 样例属性
     * 　　              input_filename,  // string, 样例输入文件名
     * 　　              output_filename  // string, 样例输出文件名
     * 　　          }
	 * 　　  } 的 Promise 对象
	 */
    select_workshop_sample_by_problem_id,


    select_official_data_by_problem_id,
    
    

    select_workshop_data_by_problem_id,


    /* 参数: id,               // int, 样例 id
	 * 　　  problem_id,       // int, 官方题目 id
	 * 　　  attribute,        // string, 样例属性
	 * 　　  subtask_number,   // int, 子任务 id
	 * 　　  testpoint_number, // int, 测试点 id
	 * 　　  input_filename,   // string, 输入文件名
	 * 　　  output_filename   // string, 输出文件名
	 * 作用: 返回创建官方样例的结果 {
	 * 　　      // 以下为必有项
	 * 　　      success,          // bool, 添加是否成功
	 * 　　      message,          // string, 返回的消息
     * 　　      // 以下为 success = true 时存在项
     * 　　      id                // int, 插入的样例 id
	 * 　　  } 的 Promise 对象
	 */
    insert_official_data,

    
    /* 参数: id,               // int, 样例 id
	 * 　　  problem_id,       // int, 工坊题目 id
	 * 　　  attribute,        // string, 样例属性
	 * 　　  subtask_number,   // int, 子任务 id
	 * 　　  testpoint_number, // int, 测试点 id
	 * 　　  input_filename,   // string, 输入文件名
	 * 　　  output_filename   // string, 输出文件名
	 * 作用: 返回创建工坊样例的结果 {
	 * 　　      // 以下为必有项
	 * 　　      success,          // bool, 添加是否成功
	 * 　　      message,          // string, 返回的消息
     * 　　      // 以下为 success = true 时存在项
     * 　　      id                // int, 插入的样例 id
	 * 　　  } 的 Promise 对象
	 */
    insert_workshop_data,


    /* 参数: problem_id       // int, 官方题目 id
	 * 作用: 返回删除官方样例的结果 {
	 * 　　      // 以下为必有项
	 * 　　      success,          // bool, 删除是否成功
	 * 　　      message           // string, 返回的消息
	 * 　　  } 的 Promise 对象
	 */
    delete_official_data_by_problem_id,


    /* 参数: problem_id       // int, 工坊题目 id
	 * 作用: 返回删除工坊样例的结果 {
	 * 　　      // 以下为必有项
	 * 　　      success,          // bool, 删除是否成功
	 * 　　      message           // string, 返回的消息
	 * 　　  } 的 Promise 对象
	 */
    delete_workshop_data_by_problem_id

};