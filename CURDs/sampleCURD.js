/* 文件名: sampleCURD.js
 * 功能: 对评测数据 evaluations 表的增删查改
 * 作者: niehy21
 * 最后更新时间: 2023/12/13
 */

const {
    insert_one_decorator,
    delete_decorator,
    select_multiple_decorator
} = require('./decorator');

function select_samples_by_problem_id(question_id, question_is_official) {
    let sql = 'SELECT sample_id AS id, \
               sample_attribute AS attribute, \
               sample_input_filename AS input_filename, \
               sample_output_filename AS output_filename \
               FROM samples WHERE question_id = ? \
               AND question_is_official = ?;';
    let sqlParams = [question_id, question_is_official];
    return select_multiple_decorator(sql, sqlParams, '样例');
}

function select_official_samples_by_problem_id(question_id) {
    return select_samples_by_problem_id(question_id, 1);
}

function select_workshop_samples_by_problem_id(question_id) {
    return select_samples_by_problem_id(question_id, 0);
}

function insert_sample(
    id, question_id, question_is_official, attribute, subtask_number,
    testpoint_number, input_filename, output_filename
) {
    let sql = 'INSERT INTO samples(sample_id, problem_id, \
               question_is_official, sample_attribute, \
               subtask_number, testpoint_number, \
               sample_input_filename, sample_output_filename) \
               VALUES(?, ?, ?, ?, ?, ?, ?, ?);';
    let sqlParams = [id, question_id, (question_is_official ? 1 : 0),
                     attribute, subtask_number, testpoint_number,
                     input_filename, output_filename];
    return insert_one_decorator(sql, sqlParams, '样例');
}

function insert_official_sample(
    id, question_id, attribute, subtask_number,
    testpoint_number, input_filename, output_filename
) {
    return insert_sample(
        id, question_id, 1, attribute, subtask_number,
        testpoint_number, input_filename, output_filename
    );
}

function insert_workshop_sample(
    id, question_id, attribute, subtask_number,
    testpoint_number, input_filename, output_filename
) {
    return insert_sample(
        id, question_id, 0, attribute, subtask_number,
        testpoint_number, input_filename, output_filename
    );
}

function delete_sample_by_question_id(question_id, question_is_official) {
    let sql = 'DELETE FROM samples WHERE question_id = ? \
               AND question_is_official = ?;';
    let sqlParams = [question_id, question_is_official];
    return delete_decorator(sql, sqlParams, '样例');
}

function delete_official_sample_by_question_id(question_id) {
    return delete_sample_by_question_id(question_id, 1);
}

function delete_workshop_sample_by_question_id(question_id) {
    return delete_sample_by_question_id(question_id, 0);
}

module.exports = {
    
    /* 参数: problem_id       // int, 表示官方题目 id
	 * 作用: 返回包含表示官方题目的样例查询结果的一个对象 {
	 * 　　      // 以下为必有项
	 * 　　      success,         // bool, 表示查询是否成功
	 * 　　      message,         // string, 表示返回的消息
     * 　　      // 以下为 success = true 时存在项
     * 　　      samples              // array, 表示题目样例的列表
	 * 　　       -> samples[i]           // object, 表示单个样例的对象 {
     * 　　              id,                  // int, 样例 id
     * 　　              attribute,           // string, 样例属性
     * 　　              input_filename,      // string, 样例输入文件名
     * 　　              output_filename      // string, 样例输出文件名
     * 　　          }
	 * 　　  } 的 Promise 对象
	 */
    select_official_samples_by_problem_id,
    
    
    /* 参数: problem_id       // int, 表示工坊题目 id
	 * 作用: 返回包含表示工坊题目的样例查询结果的一个对象 {
	 * 　　      // 以下为必有项
	 * 　　      success,         // bool, 表示查询是否成功
	 * 　　      message,         // string, 表示返回的消息
     * 　　      // 以下为 success = true 时存在项
     * 　　      samples              // array, 表示题目样例的列表
	 * 　　       -> samples[i]           // object, 表示单个样例的对象 {
     * 　　              id,                  // int, 样例 id
     * 　　              attribute,           // string, 样例属性
     * 　　              input_filename,      // string, 样例输入文件名
     * 　　              output_filename      // string, 样例输出文件名
     * 　　          }
	 * 　　  } 的 Promise 对象
	 */
    select_workshop_samples_by_problem_id,


    /* 参数: id,               // int, 样例 id
	 * 　　  question_id,      // int, 官方题目 id
	 * 　　  attribute,        // string, 样例属性
	 * 　　  subtask_number,   // int, 子任务 id
	 * 　　  testpoint_number, // int, 测试点 id
	 * 　　  input_filename,   // string, 输入文件名
	 * 　　  output_filename   // string, 输出文件名
	 * 作用: 返回包含表示创建官方样例结果的一个对象 {
	 * 　　      // 以下为必有项
	 * 　　      success,          // bool, 表示添加是否成功
	 * 　　      message,          // string, 表示返回的消息
     * 　　      // 以下为 success = true 时存在项
     * 　　      id                // int, 表示插入的样例 id
	 * 　　  } 的 Promise 对象
	 */
    insert_official_sample,

    
    /* 参数: id,               // int, 样例 id
	 * 　　  question_id,      // int, 工坊题目 id
	 * 　　  attribute,        // string, 样例属性
	 * 　　  subtask_number,   // int, 子任务 id
	 * 　　  testpoint_number, // int, 测试点 id
	 * 　　  input_filename,   // string, 输入文件名
	 * 　　  output_filename   // string, 输出文件名
	 * 作用: 返回包含表示创建工坊样例结果的一个对象 {
	 * 　　      // 以下为必有项
	 * 　　      success,          // bool, 表示添加是否成功
	 * 　　      message,          // string, 表示返回的消息
     * 　　      // 以下为 success = true 时存在项
     * 　　      id                // int, 表示插入的样例 id
	 * 　　  } 的 Promise 对象
	 */
    insert_workshop_sample,


    /* 参数: question_id       // int, 官方题目 id
	 * 作用: 返回包含表示删除官方样例结果的一个对象 {
	 * 　　      // 以下为必有项
	 * 　　      success,          // bool, 表示删除是否成功
	 * 　　      message           // string, 表示返回的消息
	 * 　　  } 的 Promise 对象
	 */
    delete_official_sample_by_question_id,


    /* 参数: question_id       // int, 工坊题目 id
	 * 作用: 返回包含表示删除工坊样例结果的一个对象 {
	 * 　　      // 以下为必有项
	 * 　　      success,          // bool, 表示删除是否成功
	 * 　　      message           // string, 表示返回的消息
	 * 　　  } 的 Promise 对象
	 */
    delete_workshop_sample_by_question_id

};