const fs = require("fs");
const axios = require("axios");
const {
  select_evaluation_configs_by_id,
  select_official_problem_by_id,
  select_workshop_problem_by_id,
} = require("../CURDs/problemCURD");
const {
  select_official_data_by_problem_id,
  select_workshop_data_by_problem_id,
  select_data_by_subtask_id,
  select_data_by_id,
} = require("../CURDs/dataCURD");
const {
  insert_evaluation,
  insert_data_evaluation,
  insert_subtask_evaluation,
  select_evaluation_received_id_by_id,
  select_evaluation_by_id,
  update_evaluation_result_by_id,
  update_data_evaluation_result_by_id,
  select_data_evaluation_by_evaluation_id,
  select_subtask_evaluation_by_evaluation_id,
  select_data_evaluation_by_subtask_evaluation_id,
  update_subtask_evaluation_result_by_id,
  select_evaluations_by_param_order,
  select_subtask_evaluation_by_id,
  select_data_evaluation_by_id,
} = require("../CURDs/evaluationCURD");
const {
  select_user_id_by_cookie,
  select_user_by_id,
} = require("../CURDs/userCURD");

const judgeUrl = require("../utils/constant").JUDGE_URL;

// 与评测机交互，刷新evaluationId对应的评测的结果
// 返回结果为对象，success属性表示是否成功，不成功则message属性表示原因
async function flush_evaluation(evaluationId) {
  // 获取评测的目前状态
  let tmp = await select_evaluation_by_id(evaluationId);
  if (tmp.success == false) {
    return tmp;
  }
  const { type, problemId, status } = tmp.result;
  if (status != null && status != undefined) {
    // 已经更新了评测结果，不用再查询
    return { success: true };
  }
  //获取评测机端的对应id
  tmp = await select_evaluation_received_id_by_id(evaluationId);
  if (tmp.success == false) {
    return tmp;
  }
  const id = tmp.result.received_id;
  // 获取题目是否有子任务
  tmp = await select_evaluation_configs_by_id(problemId, type == 0);
  if (tmp.success == false) {
    return tmp;
  }
  const { isSubtaskUsed } = tmp.result;
  // 从评测机处查询结果
  const response = await axios.get(`${judgeUrl}/get_result/${id}`);
  if (response.ok == false) {
    //还没评测完，则不进行任何改动
    return { success: true };
  } else {
    // 已经评测完了，开始更新
    if (!isSubtaskUsed) {
      // 如果没有采用子任务
      // 获取数据点评测列表
      tmp = await select_data_evaluation_by_evaluation_id(evaluationId);
      if (tmp.success == false) {
        return tmp;
      }
      const dataInfo = tmp.result;

      let allResult = "AC";
      let allTime = 0;
      let allMemory = 0;

      // 逐一保存每个数据点的评测信息
      for (let i = 0; i < dataInfo.length; i++) {
        info = dataInfo[i];
        // 更新一条新的数据点评测结果
        // 获取该数据点的评测结果，如果不是AC，尝试更新整体的结果
        const status = response.data[i.toString()].success
          ? "AC"
          : response.data[i.toString()].error_type;
        if (status != "AC" && allResult == "AC") {
          allResult = status;
        }
        // 更新整体的时间和空间
        allTime += response.data[i.toString()].time_usage;
        allMemory += response.data[i.toString()].memory_usage;
        // 更新一条新的数据点评测结果
        tmp = await update_data_evaluation_result_by_id(
          info.id,
          status,
          response.data[i.toString()].score,
          response.data[i.toString()].time_usage,
          response.data[i.toString()].memory_usage
        );
        if (tmp.success == false) {
          return tmp;
        }
      }
      // 更新整体结果
      tmp = await update_evaluation_result_by_id(
        evaluationId,
        allResult,
        response.data.score,
        allTime,
        allMemory
      );
      if (tmp.success == false) {
        return tmp;
      }
    } else {
      // 如果采用了子任务
      // 获取子任务评测列表
      tmp = await select_subtask_evaluation_by_evaluation_id(evaluationId);
      if (tmp.success == false) {
        return tmp;
      }

      let allResult = "AC";
      let allTime = 0;
      let allMemory = 0;

      const subtasks = tmp.result;
      for (let i = 0; i < subtasks.length; i++) {
        let subtask = subtasks[i];
        // 用于保存子任务最终的评测结果
        let subtaskResult = "AC";
        let subtaskTime = 0;
        let subtaskMemory = 0;

        // 获取数据点评测列表
        tmp = await select_data_evaluation_by_subtask_evaluation_id(subtask.id);
        if (tmp.success == false) {
          res.json(tmp);
          return;
        }
        const dataInfo = tmp.result;

        for (let j = 0; j < dataInfo.length; j++) {
          let info = dataInfo[j];
          // 更新一条新的数据点评测结果
          // 获取该数据点的评测结果，如果不是AC，尝试更新子任务的结果
          const status = response.data[i.toString()][j.toString()].success
            ? "AC"
            : response.data[i.toString()][j.toString()].error_type;
          if (status != "AC" && subtaskResult == "AC") {
            subtaskResult = status;
          }
          //更新子任务的时间和空间
          subtaskTime += response.data[i.toString()][j.toString()].time_usage;
          subtaskMemory +=
            response.data[i.toString()][j.toString()].memory_usage;
          // 更新一条新的数据点评测结果
          tmp = await update_data_evaluation_result_by_id(
            info.id,
            status,
            response.data[i.toString()][j.toString()].score,
            response.data[i.toString()][j.toString()].time_usage,
            response.data[i.toString()][j.toString()].memory_usage
          );
          if (tmp.success == false) {
            return tmp;
          }
        }
        // 更新一条新的子任务评测结果
        tmp = await update_subtask_evaluation_result_by_id(
          subtask.id,
          subtaskResult,
          response.data[i.toString()].score,
          subtaskTime,
          subtaskMemory
        );
        if (tmp.success == false) {
          return tmp;
        }
        // 如果不是AC，尝试更新整体的结果
        if (subtaskResult != "AC" && allResult == "AC") {
          allResult = subtaskResult;
        }
        // 更新整体的时间和空间
        allTime += subtaskTime;
        allMemory += subtaskMemory;
      }
    }
    // 更新整体结果
    tmp = await update_evaluation_result_by_id(
      evaluationId,
      allResult,
      response.data.score,
      allTime,
      allMemory
    );
    if (tmp.success == false) {
      return tmp;
    }
  }
  // 更新成功
  return { success: true };
}

// 获取评测列表
async function list(req, res, next) {
  // 先获取一遍评测列表
  let tmp = await select_evaluations_by_param_order(
    req.body.order,
    req.body.increase,
    req.body.problemType,
    req.body.problemId,
    req.body.problemKeyword,
    req.body.userId,
    req.body.userKeyword,
    req.body.language,
    req.body.status,
    req.body.start,
    req.body.end
  );
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  const tmpResult = tmp.result;
  for (let i = 0; i < tmpResult.length; i++) {
    let result = tmpResult[i];
    // 如果有尚未有结果的评测记录，尝试刷新
    if (result.status == null || result.status == undefined)
      await flush_evaluation(result.id);
  }
  // 再获取一遍评测列表
  tmp = await select_evaluations_by_param_order(
    req.body.order,
    req.body.increase,
    req.body.problemType,
    req.body.problemId,
    req.body.problemKeyword,
    req.body.userId,
    req.body.userKeyword,
    req.body.language,
    req.body.status,
    req.body.start,
    req.body.end
  );
  res.json(tmp);
  return;
}

// 获取评测信息
async function info(req, res, next) {
  // 先尝试刷新结果
  flush_evaluation(req.body.id);
  // 获取评测信息
  let tmp = await select_evaluation_by_id(req.body.id);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  const submissionInfo = tmp.result;
  // 如果还没评测完
  if (submissionInfo.status == null || submissionInfo.status == undefined) {
    res.json({
      success: true,
      type: submissionInfo.type,
      problemId: submissionInfo.problemId,
      problemTitle: problemTitle,
      userId: submissionInfo.userId,
      username: username,
      language: submissionInfo.language,
      time: submissionInfo.time,
      status: "Judging",
      score: 0,
      timeCost: 0,
      memoryCost: 0,
      subtask: false,
      dataInfo: [],
    });
  }
  // 获取题目名称
  tmp =
    submissionInfo.type == 0
      ? await select_official_problem_by_id(submissionInfo.problemId)
      : await select_workshop_problem_by_id(submissionInfo.problemId);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  const problemTitle = tmp.result.title;
  // 获取提交者用户名
  tmp = await select_user_by_id(submissionInfo.userId);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  // todo: 有时候结果全部包含在result中，有时候结果直接在第一层
  const username = tmp.username;
  // 获取题目是否有子任务
  tmp = await select_evaluation_configs_by_id(
    submissionInfo.problemId,
    submissionInfo.type == 0
  );
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  const { isSubtaskUsed } = tmp.result;
  if (!isSubtaskUsed) {
    // 如果没有采用子任务
    tmp = await select_data_evaluation_by_evaluation_id(req.body.id);
    if (tmp.success == false) {
      res.json(tmp);
      return;
    }
    const dataInfo = tmp.result;
    res.json({
      success: true,
      type: submissionInfo.type,
      problemId: submissionInfo.problemId,
      problemTitle: problemTitle,
      userId: submissionInfo.userId,
      username: username,
      language: submissionInfo.language,
      time: submissionInfo.time,
      status: submissionInfo.status,
      score: submissionInfo.score,
      timeCost: submissionInfo.timeCost,
      memoryCost: submissionInfo.memoryCost,
      subtask: false,
      dataInfo: dataInfo,
    });
    return;
  } else {
    // 如果采用了子任务
    tmp = await select_subtask_evaluation_by_evaluation_id(req.body.id);
    if (tmp.success == false) {
      res.json(tmp);
      return;
    }
    const subtaskInfo = tmp.result;
    res.json({
      success: true,
      type: submissionInfo.type,
      problemId: submissionInfo.problemId,
      problemTitle: problemTitle,
      userId: submissionInfo.userId,
      username: username,
      language: submissionInfo.language,
      time: submissionInfo.time,
      status: submissionInfo.status,
      score: submissionInfo.score,
      timeCost: submissionInfo.timeCost,
      memoryCost: submissionInfo.memoryCost,
      subtask: true,
      subtaskInfo: subtaskInfo,
    });
    return;
  }
}

// 获取子任务评测信息
async function info_subtask(req, res, next) {
  let tmp = await select_subtask_evaluation_by_id(req.body.id);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  const subtaskInfo = tmp.result;
  tmp = await select_data_evaluation_by_subtask_evaluation_id(req.body.id);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  const dataInfo = tmp.result;
  res.json({
    success: true,
    status: subtaskInfo.status,
    score: subtaskInfo.score,
    timeCost: subtaskInfo.timeCost,
    memoryCost: subtaskInfo.memoryCost,
    dataInfo: dataInfo,
  });
  return;
}

const CONTENT_LENGTH = 100;

// 获取单条数据评测信息
async function info_data(req, res, next) {
  let tmp = await select_data_evaluation_by_id(req.body.id);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  const dataInfo = tmp.result;
  const dataId = dataInfo.data_id;
  tmp = await select_data_by_id(dataId);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  const { input_filename, output_filename } = tmp.result;
  let inputPart = fs.readFileSync(input_filename);
  if (inputPart.length > CONTENT_LENGTH)
    inputPart = inputPart.substring(0, CONTENT_LENGTH);
  let answerPart = fs.readFileSync(output_filename);
  if (answerPart.length > CONTENT_LENGTH)
    answerPart = answerPart.substring(0, CONTENT_LENGTH);
  res.json({
    success: true,
    status: dataInfo.status,
    score: dataInfo.score,
    timeCost: dataInfo.timeCost,
    memoryCost: dataInfo.memoryCost,
    inputPart: inputPart,
    outputPart: "暂不支持",
    answerPart: answerPart,
    judgeContent: "暂不支持",
  });
}

// 提交评测
async function submit(req, res, next) {
  // 先根据cookie获取用户id
  let tmp = await select_user_id_by_cookie(req.body.cookie);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  const userId = tmp.result.id;
  // 保存一条评测记录
  tmp = await insert_evaluation(
    req.body.type,
    req.body.problemId,
    userId,
    req.body.language,
    req.body.sourceCode
  );
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  const evaluationId = tmp.result.id;
  // 获取题目的时间和空间限制
  tmp =
    req.body.type == 0
      ? await select_official_problem_by_id(req.body.problemId)
      : await select_workshop_problem_by_id(req.body.problemId);
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  const { timeLimit, memoryLimit } = tmp.result;
  // 获取题目是否有子任务、是否有spj
  tmp = await select_evaluation_configs_by_id(
    req.body.problemId,
    req.body.type == 0
  );
  if (tmp.success == false) {
    res.json(tmp);
    return;
  }
  const { isSubtaskUsed, isSPJUsed, SPJFilename } = tmp.result;
  const inputs = [],
    outputs = [],
    scores = [],
    time = [],
    memory = [];
  // 如果不是子任务
  if (!isSubtaskUsed) {
    // 获取数据点列表
    tmp =
      req.body.type == 0
        ? await select_official_data_by_problem_id(req.body.problemId)
        : await select_workshop_data_by_problem_id(req.body.problemId);
    if (tmp.success == false) {
      res.json(tmp);
      return;
    }
    const dataInfo = tmp.result;

    // 逐一保存每个数据点的评测信息，并预处理将要交给评测机的数组
    for (let i = 0; i < dataInfo.length; i++) {
      info = dataInfo[i];
      // 保存一条新的数据点评测信息
      tmp = await insert_data_evaluation(info.id, evaluationId, null);
      if (tmp.success == false) {
        res.json(tmp);
        return;
      }

      //预处理评测机数组
      inputs.push(
        Buffer.from(fs.readFileSync(info.input_filename)).toString("base64")
      );
      outputs.push(
        Buffer.from(fs.readFileSync(info.output_filename)).toString("base64")
      );
      scores.push(info.score);
      time.push(timeLimit);
      memory.push(memoryLimit);
    }
  } else {
    tmp = await select_subtask_by_problem_id(
      req.body.problemId,
      req.body.type == 0
    );
    if (tmp.success == false) {
      res.json(tmp);
      return;
    }
    const subtasks = tmp.result;
    for (let i = 0; i < subtasks.length; i++) {
      let subtask = subtasks[i];
      const subtaskInputs = [],
        subtaskOutputs = [],
        subtaskScores = [],
        subtaskTime = [],
        subtaskMemory = [];
      tmp = await insert_subtask_evaluation(subtask.id, evaluationId);
      if (tmp.success == false) {
        res.json(tmp);
        return;
      }
      const subtaskEvaluationId = tmp.result.id;

      tmp = await select_data_by_subtask_id(subtask.id);
      if (tmp.success == false) {
        res.json(tmp);
        return;
      }
      const dataInfo = tmp.result;

      for (let j = 0; j < dataInfo.length; j++) {
        let info = dataInfo[j];
        // 保存一条新的数据点评测信息
        tmp = await insert_data_evaluation(
          info.id,
          evaluationId,
          subtaskEvaluationId
        );
        if (tmp.success == false) {
          res.json(tmp);
          return;
        }
        //更新评测机数组
        subtaskInputs.push(
          Buffer.from(fs.readFileSync(info.input_filename)).toString("base64")
        );
        subtaskOutputs.push(
          Buffer.from(fs.readFileSync(info.output_filename)).toString("base64")
        );
        subtaskScores.push(info.score);
        subtaskTime.push(timeLimit);
        subtaskMemory.push(memoryLimit);
      }

      inputs.push(subtaskInputs);
      outputs.push(subtaskOutputs);
      scores.push(subtaskScores);
      time.push(subtaskTime);
      memory.push(subtaskMemory);
    }
  }
  const spjCode = "";
  if (isSPJUsed) {
    spjCode = Buffer.from(fs.readFileSync(SPJFilename)).toString("base64");
  }
  const query = {
    language: req.body.language,
    src: Buffer.from(req.body.sourceCode).toString("base64"),
    test_case_input: inputs,
    test_case_out: outputs,
    test_case_score: scores,
    max_time: time,
    max_memory: memory,
    use_spj: isSPJUsed,
    spj_language: "C++",
    spj_src: spjCode,
  };

  const response = await axios.post(`${judgeUrl}/submit_code`, query);
  const id = response.data.id;

  res.json({
    success: true,
    id: id,
  });
}

module.exports = {
  submit,
  list,
  info,
  info_subtask,
  info_data,
};
