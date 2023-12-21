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
} = require("../CURDs/dataCURD");
const {
  insert_evaluation,
  insert_data_evaluation,
  insert_subtask_evaluation,
} = require("../CURDs/evaluationCURD");
const { select_user_id_by_cookie } = require("../CURDs/userCURD");

const judgeUrl = require("../utils/constant").JUDGE_URL;

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
};
