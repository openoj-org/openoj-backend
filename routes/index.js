const express = require("express");
// const boom = require('boom');
const userRouter = require("./users");
const problemRouter = require("./problems");
const workshopRouter = require("./workshop");
const evaluateRouter = require("./evaluate");
const forumRouter = require("./forum");

const router = express.Router();

router.use((err, req, res, next) => {
  logger.error(err.message, err);
  if (req.xhr) {
    return res.json({
      state: false,
      msg: err.message,
    });
  }
  next(err);
});

router.use("/", userRouter); // 注入用户路由模块
router.use("/", problemRouter); // 注入官方题库路由模块
router.use("/", workshopRouter);
router.use("/", evaluateRouter);
router.use("/", forumRouter);
module.exports = router;
