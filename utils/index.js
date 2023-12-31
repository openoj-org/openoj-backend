const mysql = require("mysql2");
const config = require("../db/dbConfig");

function connect_default() {
  const { host, user, password, database } = config;
  return mysql.createConnection({
    host,
    user,
    password,
    database,
  });
}

function connect(database) {
  const { host, user, password } = config;
  return mysql.createConnection({
    host,
    user,
    password,
    database,
  });
}

function querySql_default(sql) {
  const conn = connect();
  return new Promise((resolve, reject) => {
    try {
      conn.query(sql, (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    } catch (e) {
      reject(e);
    } finally {
      conn.end();
    }
  });
}

function querySql(sql) {
  const conn = connect("oj_schema");
  return new Promise((resolve, reject) => {
    try {
      conn.query(sql, (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    } catch (e) {
      reject(e);
    } finally {
      conn.end();
    }
  });
}

function queryOne(sql) {
  return new Promise((resolve, reject) => {
    querySql(sql)
      .then((res) => {
        // console.log('res===',res)
        if (res && res.length > 0) {
          resolve(res[0]);
        } else {
          resolve(null);
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
}
function modifySql(sql, sqlParams) {
  const conn = connect("oj_schema");
  // conn.query("USE oj_schema;");
  return new Promise((resolve, reject) => {
    try {
      conn.query(sql, sqlParams, (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    } catch (e) {
      reject(e);
    } finally {
      conn.end();
    }
  });
}

function toQueryString(arr, haveParentheses) {
  let str = "";
  if (arr && arr.length > 0) {
    if (typeof arr[0] == "number") {
      str +=
        (haveParentheses ? "(" : "") + arr[0] + (haveParentheses ? ")" : "");
    } else {
      str +=
        (haveParentheses ? "(" : "") +
        '"' +
        arr[0] +
        '"' +
        (haveParentheses ? ")" : "");
    }
    for (let i = 1; i < arr.length; ++i) {
      if (typeof arr[i] == "number") {
        str +=
          ", " +
          (haveParentheses ? "(" : "") +
          arr[i] +
          (haveParentheses ? ")" : "");
      } else {
        str +=
          ", " +
          (haveParentheses ? "(" : "") +
          '"' +
          arr[i] +
          '"' +
          (haveParentheses ? ")" : "");
      }
    }
  }
  return str;
}

module.exports = {
  connect_default,
  querySql,
  querySql_default,
  queryOne,
  modifySql,
  toQueryString,
};
