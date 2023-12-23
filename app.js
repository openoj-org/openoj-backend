const bodyParser = require("body-parser");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const routes = require("./routes");
const { select_user_by_id, insert_user } = require("./CURDs/userCURD");
const { Result } = require("express-validator");
const Mail = require("nodemailer/lib/mailer");
const sha512 = require("crypto-js/sha512");
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(cookieParser("signText"));
app.use("/", routes);
app.use("/static", express.static(__dirname + "/static"));

app.listen(8088, () => {
  select_user_by_id(1).then((usr) => {
    if (!usr.success) {
      insert_user(
        "root",
        sha512("123456").toString(),
        "root@openoj.org",
        0,
        "root"
      ).then((result) => {
        if (result.success) {
          console.log("root用户已创建");
        }
      });
    }
  });
  console.log("服务已启动 http://localhost:8088");
});
