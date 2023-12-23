const fs = require("fs");
const { select_official_problem_by_id, select_official_problem_title_by_id, select_workshop_problem_title_by_id } = require("../CURDs/problemCURD");
const { select_official_data_by_problem_id } = require("../CURDs/dataCURD");
const { select_user_id_by_cookie, select_user_by_id } = require("../CURDs/userCURD");
const {v1 : uuidv1} = require('uuid');
const { insert_post, insert_reply, update_post, select_post, select_reply, select_post_by_param_order, select_reply_by_param_order } = require("../CURDs/forumCURD");

// 检查器函数, func 为 CURD 函数, isDefault 表示是否使用默认 JSON 解析
function validateFunction(req, res, next, func, isDefault) {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    const [{ message }] = err.errors;
    next(boom.badRequest(message));
  } else {
    isDefault ?
    func(req, res, next)
    .then(normalObj => {
      res.json(normalObj);
    })
    .catch(errorObj => {
      res.json(errorObj);
    }) : func(req, res, next)
    .catch(errorObj => {
      res.json(errorObj)
    });
  }
}

function list(req, res, next) {
  validateFunction(req, res, next, async (req, res, next) => {
    let { order, increase, titleKeyword, authorId, authorKeyword, sourceType, sourceId, sourceKeyword, start, end } = req.body;
    try {
      return select_post_by_param_order(order, increase, titleKeyword, authorId, authorKeyword, sourceType, sourceId, sourceKeyword, start, end);
    } catch (e) {
      return e;
    }
  }, false);
}

function info(req, res, next) {
  validateFunction(req, res, next, async (req, res, next) => {
    let { id, start, end } = req.body;
    try {
      let post = await select_post(id);
      if (!post.success) {
        return post;
      }

      if ( start > end || start < 0) {
        return {
          success: false,
          message: '获取范围出错'
        };
      }
      let replies = await select_reply_by_param_order(id,start,end);
      if (!replies.success) {
        return replies;
      }

      let ret = {
        success: true,
        message: '获取成功',
        title: post.title,
        userId: post.user_id,
        username: post.user_name,
        time: post.time,
        commentTime: post.comment_time,
        withProblem: (post.type > 0),
        type: post.type-1,
        problemId: post.problem_id,
        problemTitle: post.problem_title,
        count: post.count,
        commentInfo: replies.commentInfo
      };
      if (post.type == 0) {
        delete ret.type;
        delete ret.problemId;
        delete ret.problemTitle;
      }
      return ret;
    } catch(e) {
      return e;
    }
  }, false);
}

function comment(req, res, next) {
  validateFunction(req, res, next, async (req, res, next) => {
    let { cookie, id, content } = req.body;
    let user = await cookie_to_user(cookie);
    if(!user.success) {
      return user;
    }
    
    try {
      let reply_id = createSessionId();
      let reply = await insert_reply(reply_id,id,user.id,user.name,content);
      if (reply.success) {
        let update = await update_post(id);
        if (update.success) {
          return {
            success: true,
            message: '跟帖成功'
          };
        } else {
          return update;
        }
      } else {
        return reply;
      }
    } catch (e) {
      return e;
    }
  }, false);
}

function post(req, res, next) {
  validateFunction(req, res, next, async (req, res, next) => {
    let { cookie, withProblem, type, problemId, title, content } = req.body;
    let user = await cookie_to_user(cookie);
    if (!user.success) {
      return user;
    }
    let post_id = createSessionId();
    let typ = 0;
    let problem_id = null;
    let problem_title = null;

    if (withProblem) {
      typ = type + 1;
      problem_id = problemId;
      problem_title = await problemId_to_name(problemId,type);
      if (!problem_title.success) {
        return problem_title;
      }
    }

    try {
      let ret = await insert_post(post_id,title,content,user.id,user.name,typ,problem_id,problem_title.title,0);
      if(ret.success) {
        return {
          success: true,
          message: '发帖成功',
          id: post_id
        };
      } else {
        return ret;
      }
    } catch (e) {
      return e;
    }
  }, false);
}

async function problemId_to_name(id,type) {
	try {
    if (type == 0) {
      let problem = await select_official_problem_title_by_id(id);
      return problem;
    } else if (type == 1) {
      let problem = await select_workshop_problem_title_by_id(id);
      return problem;
    } else {
      return {
        success: false,
        message: '题目不存在'
      };
    }
  } catch (err) {
    return err;
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
      name: user_name.username
    };
  } catch (err) {
    return err;
  }
}

function createSessionId() {
  var formatedUUID = uuidv1();
  console.log(formatedUUID)
  return formatedUUID;
}

module.exports = {
  list,
  info,
  comment,
  post
}