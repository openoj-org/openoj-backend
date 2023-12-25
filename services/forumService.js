const fs = require("fs");
const {
  select_official_problem_by_id,
  select_workshop_problem_by_id,
} = require("../CURDs/problemCURD");
const { select_official_data_by_problem_id } = require("../CURDs/dataCURD");
const {
  select_user_id_by_cookie,
  select_user_by_id,
} = require("../CURDs/userCURD");
const { v1: uuidv1 } = require("uuid");
const {
  insert_post,
  insert_reply,
  update_post,
  select_post,
  select_reply,
  select_post_by_param_order,
  select_reply_by_param_order,
} = require("../CURDs/forumCURD");

// 检查器函数, func 为 CURD 函数, isDefault 表示是否使用默认 JSON 解析
function validateFunction(req, res, next, func, isDefault) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const [{ message }] = err.errors;
    next(boom.badRequest(message));
  } else {
    isDefault
      ? func(req, res, next)
          .then((normalObj) => {
            res.json(normalObj);
          })
          .catch((errorObj) => {
            res.json(errorObj);
          })
      : func(req, res, next).catch((errorObj) => {
          res.json(errorObj);
        });
  }
}

async function list(req, res, next) {
  try {
    let {
      order,
      increase,
      titleKeyword,
      authorId,
      authorKeyword,
      sourceType,
      sourceId,
      sourceKeyword,
      start,
      end,
    } = req.query;
    increase = increase == "true";
    if (authorId != null && authorId != undefined && authorId != "")
      authorId = Number(authorId);
    else authorId = undefined;
    if (sourceType != null && sourceType != undefined && sourceType != "")
      sourceType = Number(sourceType);
    else sourceType = undefined;
    start = Number(start);
    end = Number(end);
    let tmp = await select_post_by_param_order(
      order,
      increase,
      titleKeyword,
      authorId,
      authorKeyword,
      sourceType,
      sourceId,
      sourceKeyword,
      start,
      end
    );
    if (tmp.success == false) {
      res.json(tmp);
      return;
    }
    const result = tmp.result;
    const count = tmp.count;
    for (let i = 0; i < result.length; i++) {
      const post = result[i];
      post.withProblem = post.type != 0;
      if (post.withProblem != false) {
        post.type = post.type == 1 ? 0 : 1;
        tmp =
          post.type == 0
            ? await select_official_problem_by_id(post.problemId)
            : await select_workshop_problem_by_id(post.problemId);
        if (tmp.success == false) {
          res.json(tmp);
          return;
        }
        post.problemTitle = tmp.result.title;
      } else delete post.type;
      tmp = await select_user_by_id(post.userId);
      if (tmp.success == false) {
        res.json(tmp);
        return;
      }
      post.username = tmp.username;
      result[i] = post;
    }
    res.json({ success: true, result: result, count: count });
  } catch (e) {
    res.json({ success: false, message: "文件操作出错" });
    return;
  }
}

async function info(req, res, next) {
  try {
    let { id, start, end } = req.query;
    id = Number(id);
    start = Number(start);
    end = Number(end);
    let post = await select_post(id);
    if (!post.success) {
      res.json(post);
      return;
    }

    if (start > end || start < 0) {
      return {
        success: false,
        message: "获取范围出错",
      };
    }

    let replies = await select_reply_by_param_order(id, start, end);
    if (!replies.success) {
      res.json(replies);
      return;
    }

    post = post.result;

    post.withProblem = post.type != 0;
    if (post.withProblem != false) {
      post.type = post.type == 1 ? 0 : 1;
      let tmp =
        post.type == 0
          ? await select_official_problem_by_id(post.problemId)
          : await select_workshop_problem_by_id(post.problemId);
      if (tmp.success == false) {
        res.json(tmp);
        return;
      }
      post.problemTitle = tmp.result.title;
    } else delete post.type;
    let tmp = await select_user_by_id(post.userId);
    if (tmp.success == false) {
      res.json(tmp);
      return;
    }
    post.username = tmp.username;

    replies = replies.result;

    for (let i = 0; i < replies.length; i++) {
      const reply = replies[i];
      let tmp = await select_user_by_id(reply.userId);
      if (tmp.success == false) {
        res.json(tmp);
        return;
      }
      reply.username = tmp.username;
      replies[i] = reply;
    }

    let ret = {
      success: true,
      title: post.title,
      userId: post.userId,
      username: post.username,
      time: post.time,
      commentTime: post.commentTime,
      withProblem: true,
      type: post.type ?? 0,
      problemId: post.problemId ?? 0,
      problemTitle: post.problemTitle ?? "",
      count: post.count,
      commentInfo: replies,
    };
    if (post.withProblem == false) {
      delete ret.type;
      delete ret.problemId;
      delete ret.problemTitle;
    }
    res.json(ret);
  } catch (e) {
    res.json({ success: false, message: "文件操作出错" });
  }
}

async function comment(req, res, next) {
  try {
    let { cookie, id, content } = req.body;
    id = Number(id);
    let user = await cookie_to_user(cookie);
    if (!user.success) {
      res.json(user);
      return;
    }
    const userId = user.id;
    let reply = await insert_reply(id, userId, content);
    res.json(reply);
  } catch (e) {
    return e;
  }
}

async function post(req, res, next) {
  try {
    let { cookie, withProblem, type, problemId, title, content } = req.body;
    let user = await cookie_to_user(cookie);
    if (!user.success) {
      res.json(user);
      return;
    }
    let typ = 0;
    let problem_id = null;
    let problem_title = null;

    if (withProblem) {
      typ = type + 1;
      problem_id = problemId;
      let tmp =
        type == 0
          ? await select_official_problem_by_id(problemId)
          : await select_workshop_problem_by_id(problemId);
      if (tmp.success == false) {
        res.json(tmp);
        return;
      }
      problem_title = tmp.result.title;
    }
    let ret = await insert_post(title, typ, problem_id, user.id, content);
    if (ret.success == false) {
      res.json(ret);
      return;
    }
    const id = ret.id;
    const userId = user.id;
    let reply = await insert_reply(id, userId, content);
    if (reply.success == false) {
      res.json(reply);
      return;
    }
    res.json({ success: true, id: id });
  } catch (e) {
    res.json({ success: false, message: "文件操作出错" });
  }
}

async function cookie_to_user(cookie) {
  try {
    let user_id = await select_user_id_by_cookie(cookie);
    if (!user_id.success) {
      return user_id;
    }

    let user_name = await select_user_by_id(user_id.id);
    if (!user_name.success) {
      return user_name;
    }

    return {
      success: true,
      id: user_id.id,
      name: user_name.username,
    };
  } catch (err) {
    return err;
  }
}

function createSessionId() {
  var formatedUUID = uuidv1();
  return formatedUUID;
}

module.exports = {
  list,
  info,
  comment,
  post,
};
