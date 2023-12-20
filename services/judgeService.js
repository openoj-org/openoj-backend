const axios = require("axios");

const judgeUrl = "http://localhost:5000";

// 提交评测
function submit(req, res, next) {
  const query = {
    language: req.body.language,
    src: Buffer.from(req.body.sourceCode).toString("base64"),
  };
}
