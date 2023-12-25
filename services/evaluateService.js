const {
  select_recommendation_by_pid_and_uid,
  select_official_rating_by_pid_and_uid,
  select_workshop_rating_by_pid_and_uid,
  insert_recommendation_by_pid_and_uid,
  delete_recommendation_by_pid_and_uid,
  delete_tags_by_id,
  insert_tags_by_id,
  delete_official_rating,
  delete_workshop_rating,
  insert_workshop_rating,
  insert_official_rating,
} = require("../CURDs/ratingCURD");
const {
  authenticate_cookie,
  select_user_id_by_cookie,
} = require("../CURDs/userCURD");

// 获取之前的推荐
async function get_recommend(req, res, next) {
  // 先根据cookie获取用户id
  let tmp = await select_user_id_by_cookie(req.query.cookie);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  const userId = tmp.id;
  // 验证用户是否为受信用户及以上
  tmp = await authenticate_cookie(req.query.cookie, 2);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  // 查找是否推荐过
  tmp = await select_recommendation_by_pid_and_uid(req.query.problemId, userId);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  res.json({
    success: true,
    recommend: tmp.result.recommend,
  });
  return;
}

// 获取之前的评价
async function get_evalue(req, res, next) {
  // 先根据cookie获取用户id
  let tmp = await select_user_id_by_cookie(req.query.cookie);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  const userId = tmp.id;
  // 验证用户是否为受信用户及以上
  tmp = await authenticate_cookie(req.query.cookie, 2);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  // 查找之前的评分
  tmp =
    req.query.type == 0
      ? await select_official_rating_by_pid_and_uid(req.query.problemId, userId)
      : await select_workshop_rating_by_pid_and_uid(
          req.query.problemId,
          userId
        );
  if (
    tmp.result == undefined ||
    tmp.result.rating == null ||
    tmp.result.rating == undefined
  ) {
    res.json({
      success: true,
      Comment: false,
    });
    return;
  }
  const rating = tmp.result.rating;
  res.json({
    success: true,
    comment: true,
    grade: rating,
  });
}

// 推荐创意工坊题目
async function recommend(req, res, next) {
  // 先根据cookie获取用户id
  let tmp = await select_user_id_by_cookie(req.body.cookie);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  const userId = tmp.id;
  // 验证用户是否为受信用户及以上
  tmp = await authenticate_cookie(req.body.cookie, 2);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  if (req.body.recommend) {
    tmp = await insert_recommendation_by_pid_and_uid(req.body.id, userId);
    if (tmp.success == false) {
      res.json(tmp);
      return;
    }
    res.json({ success: true });
  } else {
    tmp = await delete_recommendation_by_pid_and_uid(req.body.id, userId);
    if (tmp.success == false) {
      res.json(tmp);
      return;
    }
    res.json({ success: true });
  }
}

// 编辑题目标签
async function edit_tag(req, res, next) {
  // 验证用户是否为受信用户及以上
  let tmp = await authenticate_cookie(req.body.cookie, 2);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  // 先删除所有的标签
  tmp = await delete_tags_by_id(req.body.problemId, req.body.type == 0);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  // 再插入所有新的标签
  tmp = await insert_tags_by_id(
    req.body.problemId,
    req.body.type == 0,
    req.body.tags
  );
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  res.json({ success: true });
}

// 评价题目
async function evalue(req, res, next) {
  // 先根据cookie获取用户id
  let tmp = await select_user_id_by_cookie(req.body.cookie);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  const userId = tmp.id;
  // 验证用户是否为受信用户及以上
  tmp = await authenticate_cookie(req.body.cookie, 2);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  // 先取消之前的评分
  tmp =
    req.body.type == 0
      ? await delete_official_rating(req.body.problemId, userId)
      : await delete_workshop_rating(req.body.problemId, userId);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  if (req.body.comment) {
    // 进行评分
    tmp =
      req.body.type == 0
        ? await insert_official_rating(
            req.body.problemId,
            userId,
            req.body.grade
          )
        : await insert_workshop_rating(
            req.body.problemId,
            userId,
            req.body.grade
          );
    if (tmp.success == false) {
      res.json(tmp);
      return;
    }
  }
  res.json({ success: true });
}

module.exports = {
  get_recommend,
  get_evalue,
  recommend,
  edit_tag,
  evalue,
};
