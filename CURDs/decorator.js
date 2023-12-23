/* 文件名: decorator.js
 * 功能: 对增删查改的辅助（修饰器）函数
 * 作者: niehy21
 * 最后更新时间: 2023/12/12
 */

const {
  querySql,
  queryOne,
  modifySql,
  toQueryString,
} = require("../utils/index");

function error_decorator(func) {
  return func().catch((err) => {
    return {
      success: false,
      message: err.message,
    };
  });
}

function update_decorator(sql, sqlParams, name) {
  return error_decorator(modifySql.bind(null, sql, sqlParams)).then(
    (result) => {
      let flag = result && result.affectedRows != 0;
      flag ? {} : console.log(result.message);
      return {
        success: flag,
        message: flag ? `修改${name}成功` : `修改${name}失败`,
      };
    }
  );
}

function select_one_decorator(sql, sqlParams, name) {
  return error_decorator(modifySql.bind(null, sql, sqlParams)).then(
    (results) => {
      let flag = results && results.length != 0;
      flag ? {} : console.log(results ? results.message : "");
      return {
        success: flag,
        message: flag ? `查询${name}成功` : `查询${name}失败`,
        result: flag ? results[0] : undefined,
      };
    }
  );
}

function select_multiple_decorator(sql, sqlParams, name) {
  return error_decorator(modifySql.bind(null, sql, sqlParams)).then(
    (results) => {
      let flag = (results != null);
      flag ? {} : console.log(results.message);
      return {
        success: flag,
        message: flag ? `查询${name}成功` : `查询${name}失败`,
        result: flag ? results : undefined,
        count: flag ? results.length : undefined,
      };
    }
  );
}

function insert_one_decorator(sql, sqlParams, name) {
  return error_decorator(modifySql.bind(null, sql, sqlParams)).then(
    (result) => {
      let flag = result && result.affectedRows != 0;
      flag ? {} : console.log(result.message);
      return {
        success: flag,
        message: flag ? `添加${name}成功` : `添加${name}失败`,
        id: flag ? result.insertId : undefined,
      };
    }
  );
}

function insert_multiple_decorator(sql, sqlParams, name) {
  return error_decorator(modifySql.bind(null, sql, sqlParams)).then(
    (result) => {
      let flag = result && result.affectedRows != 0;
      flag ? {} : console.log(result.message);
      return {
        success: flag,
        message: flag ? `批量添加${name}成功` : `批量添加${name}失败`,
      };
    }
  );
}

function delete_decorator(sql, sqlParams, name) {
  return error_decorator(modifySql.bind(null, sql, sqlParams)).then(
    (result) => {
      let flag = !!result;
      flag ? {} : console.log(result.message);
      return {
        success: flag,
        message: flag
          ? `删除了 ${result.affectedRows} 项${name}`
          : `删除${name}失败`,
      };
    }
  );
}

module.exports = {
  /* 参数: sql,               // string, 表示 SQL 语句
   * 　　  sqlParams,         // array, 表示 SQL 中占位符的参数列表
   * 　　   -> sqlParams[i]   // any, 表示 SQL 参数
   * 　　  name               // string, 表示查询的对象名称
   * 作用: 返回包含表示查询到的第一个结果的一个对象 {
   * 　　      // 以下为必有项
   * 　　      success,           // bool, 表示批量添加是否成功
   * 　　      message,           // string, 表示返回的消息
   * 　　      // 以下为 success = true 时存在项
   * 　　      result             // object, 表示查询到的第一个结果
   * 　　  } 的 Promise 对象
   */
  select_one_decorator,

  /* 参数: sql,               // string, 表示 SQL 语句
   * 　　  sqlParams,         // array, 表示 SQL 中占位符的参数列表
   * 　　   -> sqlParams[i]   // any, 表示 SQL 参数
   * 　　  name               // string, 表示查询的对象名称
   * 作用: 返回包含表示查询到的全部结果的一个对象 {
   * 　　      // 以下为必有项
   * 　　      success,           // bool, 表示批量添加是否成功
   * 　　      message,           // string, 表示返回的消息
   * 　　      // 以下为 success = true 时存在项
   * 　　      result             // array, 表示查询到的全部结果
   * 　　       -> result[i]          // object, 表示单个结果
   * 　　  } 的 Promise 对象
   */
  select_multiple_decorator,

  /* 参数: sql,               // string, 表示 SQL 语句
   * 　　  sqlParams,         // array, 表示 SQL 中占位符的参数列表
   * 　　   -> sqlParams[i]   // any, 表示 SQL 参数
   * 　　  name               // string, 表示批量添加的对象名称
   * 作用: 返回包含表示批量添加结果的一个对象 {
   * 　　      // 以下为必有项
   * 　　      success,           // bool, 表示批量添加是否成功
   * 　　      message            // string, 表示返回的消息
   * 　　  } 的 Promise 对象
   */
  insert_multiple_decorator,

  /* 参数: sql,               // string, 表示 SQL 语句
   * 　　  sqlParams,         // array, 表示 SQL 中占位符的参数列表
   * 　　   -> sqlParams[i]   // any, 表示 SQL 参数
   * 　　  name               // string, 表示添加的对象名称
   * 作用: 返回包含表示添加结果的一个对象 {
   * 　　      // 以下为必有项
   * 　　      success,           // bool, 表示添加是否成功
   * 　　      message,           // string, 表示返回的消息
   * 　　      // 以下为 success = true 时存在项
   * 　　      id                 // string, 表示插入对象的 ID
   * 　　  } 的 Promise 对象
   */
  insert_one_decorator,

  /* 参数: sql,               // string, 表示 SQL 语句
   * 　　  sqlParams,         // array, 表示 SQL 中占位符的参数列表
   * 　　   -> sqlParams[i]   // any, 表示 SQL 参数
   * 　　  name               // string, 表示修改的对象名称
   * 作用: 返回包含表示修改结果的一个对象 {
   * 　　      // 以下为必有项
   * 　　      success,           // bool, 表示修改是否成功
   * 　　      message            // string, 表示返回的消息
   * 　　  } 的 Promise 对象
   */
  update_decorator,

  /* 参数: sql,               // string, 表示 SQL 语句
   * 　　  sqlParams,         // array, 表示 SQL 中占位符的参数列表
   * 　　   -> sqlParams[i]   // any, 表示 SQL 参数
   * 　　  name               // string, 表示删除的对象名称
   * 作用: 返回包含表示删除结果的一个对象 {
   * 　　      // 以下为必有项
   * 　　      success,           // bool, 表示删除是否成功
   * 　　      message            // string, 表示返回的消息
   * 　　  } 的 Promise 对象
   */
  delete_decorator,
};
