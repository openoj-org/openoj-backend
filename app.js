const bodyParser = require("body-parser");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const routes = require("./routes");
const {
  select_user_by_id,
  insert_user,
  select_users_by_param_order,
} = require("./CURDs/userCURD");
const { Result } = require("express-validator");
const Mail = require("nodemailer/lib/mailer");
const sha512 = require("crypto-js/sha512");
const { connect_default, querySql_default, querySql } = require("./utils");
const app = express();
const fs = require("fs");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(cookieParser("signText"));
app.use("/", routes);
app.use("/static", express.static(__dirname + "/static"));

app.listen(8088, async () => {
  await (async () => {
    // 第一次连接, 尝试创建数据库及表格
    try {
      let selected = await querySql_default('SHOW DATABASES LIKE "oj_schema"');
      if (selected.length > 0) {
        console.log("数据库已存在，不做任何操作");
        return;
      }
    } catch (e) {
      console.log("访问数据库失败：", e);
      return;
    }

    console.log("检测到数据库不存在");

    // 不存在已有数据库, 则创建
    try {
      await querySql_default("CREATE DATABASE oj_schema");
    } catch (e) {
      console.log("创建数据库失败：", e);
      return;
    }

    console.log("创建数据库成功");

    // 根据 oj_schema.sql 文件, 创建数据表格
    try {
      // 读取 SQL 文件的内容
      const sqlFilePath = "./oj_schema.sql";
      const sqlQueries = fs.readFileSync(sqlFilePath, "utf-8").split(";");

      for (const query of sqlQueries) {
        if (query.trim() !== "") {
          // 执行单个查询语句
          await querySql(query);
        }
      }
    } catch (err) {
      console.log("创建数据表失败：", err);
      return;
    }

    console.log("创建数据表成功");

    // 根据 oj_triggers.sql 文件, 创建触发器
    try {
      // 读取 SQL 文件的内容
      const sqlFilePath = "./oj_triggers.sql";
      const sqlQueries = fs
        .readFileSync(sqlFilePath, "utf-8")
        .split("-- separator");

      for (const query of sqlQueries) {
        if (query.trim() !== "") {
          // 执行单个查询语句
          await querySql(query);
        }
      }
    } catch (err) {
      console.log("创建触发器失败：", err);
      return;
    }

    console.log("创建触发器成功");

    // 初始化全局设置
    try {
      let settings = await querySql(
        "INSERT INTO GLOBAL_SETTINGS(allow_register, have_list) VALUES(1, 0)"
      );
      if (settings.affectedRows == 0) {
        console.log("初始化全局设置失败");
        return;
      }
    } catch (e) {
      console.log("初始化全局设置失败：", e);
      return;
    }

    console.log("初始化全局设置成功");
  })();

  select_users_by_param_order("user_id", true).then(async (users) => {
    if (!users.success) {
      console.log("查找用户失败");
      return;
    }
    if (users.result.length) {
      console.log("检测到用户存在，不做操作");
      return;
    }
    await insert_user(
      "root",
      sha512("123456").toString(),
      "root@openoj.org",
      0,
      "root"
    )
      .then((result) => {
        if (result.success) {
          console.log("root 用户已创建");
        } else {
          console.log("root 用户创建失败");
        }
      })
      .catch((e) => {
        console.log("root 用户创建失败", e);
      });
  });
  // select_user_by_id(1).then((usr) => {
  // 	if (!usr.success) {
  // 	insert_user(
  // 		"root",
  // 		sha512("123456").toString(),
  // 		"root@openoj.org",
  // 		0,
  // 		"root"
  // 	).then((result) => {
  // 		if (result.success) {
  // 			console.log("root 用户已创建");
  // 		} else {
  // 			console.log("root 用户创建失败");
  // 		}
  // 	}).catch((e) => {
  // 		console.log('root 用户创建失败', e);
  // 	});
  // 	}
  // });
  console.log("服务已启动 http://localhost:8088");
});
