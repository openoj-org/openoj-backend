const {
  select_one_decorator,
  select_multiple_decorator,
  insert_one_decorator,
  update_decorator,
  delete_decorator,
} = require("./decorator");

const {
  querySql,
  queryOne,
  modifySql,
  toQueryString,
} = require("../utils/index");

// 查询 global_settings, 返回 { allowRegister, haveList }
function select_global_settings() {
  return querySql(`SELECT * FROM global_settings;`)
    .then((global_settings) => {
      let flag = global_settings && global_settings.length > 0;
      return {
        success: flag,
        message: "查询全局设置" + (flag ? "成功" : "失败"),
        allowRegister: flag ? global_settings[0].allow_register > 0 : undefined,
        haveList: flag ? global_settings[0].have_list > 0 : undefined,
      };
    })
    .catch((err) => {
      return {
        success: false,
        message: err.message,
      };
    });
}

// 更新 global_settings 的 param 字段 ('allow_register'
// 或 'have_list') 的值为 value
function update_global_settings(param, value) {
  let numValue = value ? 1 : 0;
  let sql = `UPDATE global_settings SET ${param} = ${numValue} \
	           WHERE global_setting_id = 0;`;
  return querySql(sql)
    .then((result) => {
      return {
        success: result.affectedRows != 0,
        message:
          result.affectedRows != 0 ? `${param} 更新成功` : `${param} 更新失败`,
      };
    })
    .catch((err) => {
      return {
        success: false,
        message: err.message,
      };
    });
}

// 可以注册的邮箱列表
function select_email_suffixes() {
  return querySql(`SELECT * FROM email_suffixes;`)
    .then((email_suffixes) => {
      if (!email_suffixes || email_suffixes.length == 0) {
        return {
          success: false,
          suffixList: undefined,
          message: "邮箱后缀列表为空",
        };
      } else {
        return {
          success: true,
          suffixList: email_suffixes.map((obj) => obj.email_suffix),
          message: "邮箱后缀列表查询成功",
        };
      }
    })
    .catch((err) => {
      return {
        success: false,
        message: err.message,
      };
    });
}

// 批量添加邮箱后缀
function insert_email_suffixes(suffixes) {
  let sql =
    "INSERT INTO email_suffixes (email_suffix) VALUES " +
    toQueryString(suffixes, true) +
    ";";
  // console.log(sql);
  return querySql(sql)
    .then((result) => {
      return {
        success: result.affectedRows != 0,
        message: result.affectedRows != 0 ? "添加成功" : "添加失败",
      };
    })
    .catch((err) => {
      return {
        success: false,
        message: err.message,
      };
    });
}

// 删除所有邮箱后缀
function delete_email_suffixes() {
  let sql = "DELETE FROM email_suffixes;";
  return querySql(sql)
    .then((result) => {
      return {
        success: result.affectedRows != 0,
        message:
          result.affectedRows != 0 ? "删除邮箱后缀成功" : "删除邮箱后缀失败",
      };
    })
    .catch((err) => {
      return {
        success: false,
        message: err.message,
      };
    });
}

// 根据 id 查询用户身份
function select_user_character_by_id(id) {
  let sql =
    "SELECT user_role AS `character` \
	           FROM users WHERE user_id = ?;";
  let sqlParams = [id];
  return select_one_decorator(sql, sqlParams, "用户身份");
}

// 验证用户 cookie, mode 为模式,
// 0 表示验证 root,
// 1 表示验证管理员 (及以上),
// 2 表示验证受信用户 (及以上),
// 3 表示验证正常用户 (及以上),
// -1 表示验证管理员 (及以下),
// -2 表示验证受信用户 (及以下),
// -3 表示验证正常用户 (及以下),
// -4 表示验证封禁用户
async function authenticate_cookie(cookie, mode) {
  try {
    // 根据 cookie 查找 id
    let user_id = await select_user_id_by_cookie(cookie);
    if (!user_id.success) {
      return user_id;
    }

    // 根据 id 取 character
    let user_character = await select_user_character_by_id(user_id.id);
    if (!user_character.success) {
      return user_character;
    }

    // 判断 character 是否符合条件
    let flag_permitted =
      mode < 0
        ? user_character.result.character >= -mode
        : user_character.result.character <= mode;
    return {
      success: flag_permitted,
      message: flag_permitted ? "验证通过" : "验证不通过",
      id: flag_permitted ? user_id.id : undefined,
    };
  } catch (err) {
    return err;
  }
}

// 根据 id 查询用户信息
function select_user_by_id(id) {
  return select_first_user_info_by_param("user_id", id);
}

// 根据 email 查询用户信息
function select_user_by_email(email) {
  return select_first_user_info_by_param("user_email", email);
}

// 根据 name 查询用户信息
function select_user_by_name(name) {
  return select_first_user_info_by_param("user_name", name);
}

// 根据 id 查询用户全部信息
function select_full_user_by_id(id) {
  return select_first_user_by_param("user_id", id);
}

// 根据 email 查询用户全部信息
function select_full_user_by_email(email) {
  return select_first_user_by_param("user_email", email);
}

// 根据 name 查询用户全部信息
function select_full_user_by_name(name) {
  return select_first_user_by_param("user_name", name);
}

// 查询参数 param 为 value 的首个用户
function select_first_user_by_param(param, value) {
  return querySql(`SELECT * FROM users WHERE ${param} LIKE '${value}';`)
    .then((users) => {
      // console.log(param, value, '\n');
      if (!users || users.length == 0) {
        return {
          success: false,
          message: "用户不存在",
        };
      } else {
        return {
          success: true,
          message: "用户信息查询成功",
          userInfo: users[0],
        };
      }
    })
    .catch((err) => {
      return {
        success: false,
        message: err.message,
      };
    });
}

// 查询参数 param 为 value 的首个用户的重要信息
function select_first_user_info_by_param(param, value) {
  return select_first_user_by_param(param, value).then((usr) => {
    // console.log(usr);
    if (usr && usr.success) {
      let usrInfo = usr.userInfo;
      return {
        success: usr.success,
        message: usr.message,
        username: usrInfo.user_name,
        character: usrInfo.user_role,
        signature: usrInfo.user_signature,
        registerTime: usrInfo.user_register_time,
        emailChangeTime: usrInfo.user_email_change_time,
        nameChangeTime: usrInfo.user_name_change_time,
        pass: usrInfo.user_pass_number,
        mail: usrInfo.user_email,
      };
    } else {
      return {
        success: false,
        message: "用户不存在",
      };
    }
  });
}

// 根据某一参数排序查询用户列表，返回第 start 至 end 个结果组成的列表
async function select_users_by_param_order(
  order,
  increase,
  usernameKeyword,
  start,
  end
) {
  let sql =
    "SELECT user_id AS id, \
	           user_name AS username, \
			   user_role AS `character`, \
			   user_signature AS signature, \
			   user_register_time AS registerTime, \
			   user_pass_number AS pass FROM users ";
  let sqlParams = [];
  if (usernameKeyword != null) {
    sql += "WHERE user_name LIKE ? ";
    sqlParams.push(usernameKeyword + "%");
  }
  sql += "ORDER BY ? " + (increase ? "ASC " : "DESC ");
  sqlParams.push(order);
  if (start && end) {
    sql += "LIMIT ?, ?";
    sqlParams.push(Number(start));
    sqlParams.push(Number(end));
  }

  let users = await select_multiple_decorator(sql, sqlParams, "用户列表");
  if (!users.success) {
    return users;
  }
  console.log(users);
  let count = await select_one_decorator(
    "SELECT COUNT(*) AS count FROM users",
    [],
    "用户数量"
  );
  if (!count.success) {
    return count;
  }

  users.count = count.result.count;
  return users;
}

function insert_user(name, passwordHash, mail, role, signature) {
  // user_name_modify_time, user_email_modify_time 默认设置为 UTC 毫秒数,
  // 而 user_pass_number 默认为 0
  let sql =
    "INSERT INTO users(user_name, user_password_hash, user_email, \
		                         user_role, user_signature, user_register_time) " +
    `VALUES('${name}', '${passwordHash}', '${mail}', '${role}', '${signature}', '${new Date().getTime()}');`;
  let sqlParams = [
    name,
    passwordHash,
    mail,
    role,
    signature,
    new Date().getTime(),
  ];
  return insert_one_decorator(sql, sqlParams, "用户");
}

function update_user(id, param, value)
{
	let sql = 'UPDATE users SET ? = ?';
	let sqlParams = [param, value];
	if (param == 'user_name') {
		sql += ', ? = ?';
		sqlParams.push('user_name_change_time');
		sqlParams.push(new Date().getTime());
	} else if (param == 'user_email') {
		sql += ', ? = ?';
		sqlParams.push('user_email_change_time');
		sqlParams.push(new Date().getTime());
	}
	sql += ' WHERE user_id = ?;';
	sqlParams.push(id);

  return update_decorator(sql, sqlParams, param + " ");
}

function delete_user(id) {
  let sql = "DELETE FROM users WHERE user_id = ?";
  let sqlParams = [id];
  return delete_decorator(sql, sqlParams, "用户");
}

function insert_cookie(id, cookie) {
  let sql = "INSERT INTO cookies(user_id, cookie) " + "VALUES(?, ?);";
  let sqlParams = [id, cookie];
  return insert_one_decorator(sql, sqlParams, "cookie ");
}

function select_user_id_by_cookie(cookie) {
  let sql = "SELECT * FROM cookies " + `WHERE cookie = '${cookie}';`;
  return querySql(sql)
    .then((coos) => {
      if (coos && coos.length > 0) {
        return {
          success: true,
          message: "查询 id 成功",
          id: coos[0].user_id,
        };
      } else {
        return {
          success: false,
          message: "无效的 cookie",
        };
      }
    })
    .catch((err) => {
      return {
        success: false,
        message: err.message,
      };
    });
}

function delete_cookie(cookie) {
  return querySql(`DELETE FROM cookies WHERE cookie = '${cookie}'`)
    .then((result) => {
      return {
        success: result.affectedRows != 0,
        message: result.affectedRows != 0 ? "cookie 销毁成功" : "cookie 无效",
      };
    })
    .catch((err) => {
      return {
        success: false,
        message: err.message,
      };
    });
}

module.exports = {
  /* 参数: 无
   * 作用: 返回包含表示全局设置查询结果的一个对象 {
   * 　　  　　// 以下为必有项
   * 　　  　　success,       // bool, 表示查询是否成功
   * 　　  　　message,       // string, 表示返回的消息
   * 　　  　　// 以下为 success = true 时存在项
   * 　　  　　allowRegister, // bool, 表示是否开放注册
   * 　　  　　haveList       // bool, 表示是否限制注册邮箱后缀
   * 　　  } 的 Promise 对象
   */
  select_global_settings,

  /* 参数: param, // string, 'allow_register'/'have_list'
   * 　　         // 表示是否开放注册/是否限制可注册邮箱后缀
   * 　　  value  // bool, 表示是否
   * 作用: 返回包含表示全局设置更新结果的一个对象 {
   * 　　  　　// 以下为必有项
   * 　　  　　success,       // bool, 表示更新是否成功
   * 　　  　　message        // string, 表示返回的消息
   * 　　  } 的 Promise 对象
   */
  update_global_settings,

  /* 参数: 无
   * 作用: 返回包含表示邮箱后缀列表查询结果的一个对象 {
   * 　　  　　// 以下为必有项
   * 　　  　　success,       // bool, 表示查询是否成功
   * 　　  　　message,       // string, 表示返回的消息
   * 　　  　　// 以下为 success = true 时存在项
   * 　　  　　suffixList     // array, 表示邮箱后缀 (string) 的列表
   * 　　  } 的 Promise 对象
   */
  select_email_suffixes,

  /* 参数: suffixes           // array, 表示邮箱后缀 (string) 的列表
   * 作用: 返回包含表示邮箱后缀列表更新结果的一个对象 {
   * 　　  　　// 以下为必有项
   * 　　  　　success,       // bool, 表示更新是否成功
   * 　　  　　message        // string, 表示返回的消息
   * 　　  } 的 Promise 对象
   */
  insert_email_suffixes,

  select_user_character_by_id,
  // 验证 cookie
  authenticate_cookie,
  // 根据 id 查询用户信息
  select_user_by_id,
  // 根据 email 查询用户信息
  select_user_by_email,
  // 根据 name 查询用户信息
  select_user_by_name,

  select_full_user_by_email,
  select_full_user_by_id,
  select_full_user_by_name,

  // 根据某一参数 order 按 increase 升序或降序排列，
  // 查询用户名含前缀为 usernameKeyword 的用户列表，
  // 返回第 start 至 end 个结果组成的列表
  select_users_by_param_order,
  // 使用用户名 name, 密码哈希 passwordHash, 邮箱 mail,
  // 角色 role, 签名 signature 注册用户
  insert_user,
  // 更新给定 id 的用户属性 param 为 value
  update_user,
  // 注销给定 id 的用户
  delete_user,
  // 插入 cookie
  insert_cookie,
  // 根据 cookie 查询 user_id
  select_user_id_by_cookie,
  // 销毁 cookie
  delete_cookie,

  delete_email_suffixes,
};
