const fs = require("fs");
const axios = require("axios");
const {
  select_evaluation_configs_by_id,
  select_official_problem_by_id,
} = require("../CURDs/problemCURD");
const { select_official_data_by_problem_id } = require("../CURDs/dataCURD");

const judgeUrl = "http://localhost:5000";

// 提交评测
async function submit(req, res, next) {
  // TODO: use workshop CURD
  let tmp =
    req.body.type == 0
      ? await select_official_problem_by_id(req.body.problemId)
      : await select_official_problem_by_id(req.body.problemId);
  if (tmp.success == false) {
    res.json(tmp);
  }
  const { timeLimit, memoryLimit } = tmp.result;
  tmp = await select_evaluation_configs_by_id(
    req.body.problemId,
    req.body.type == 0
  );
  if (tmp.success == false) {
    res.json(tmp);
  }
  const { isSubtaskUsed, isSPJUsed, SPJFilename } = tmp.result;
  const inputs = [],
    outputs = [],
    scores = [],
    time = [],
    memory = [];
  if (!isSubtaskUsed) {
    tmp =
      req.body.type == 0
        ? select_official_data_by_problem_id(req.body.problemId)
        : select_workshop_data_by_problem_id(req.body.problemId);
    if (tmp.success == false) {
      res.json(tmp);
    }

    const dataInfo = tmp.result;

    dataInfo.forEach((info) => {
      inputs.push(
        Buffer.from(fs.readFileSync(info.input_filename)).toString("base64")
      );
      outputs.push(
        Buffer.from(fs.readFileSync(info.output_filename)).toString("base64")
      );
      scores.push(info.score);
      time.push(timeLimit);
      memory.push(memoryLimit);
    });
  } else {
    // TODO
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
    spj_language: "C++11",
    spj_src: spjCode,
  };

  const response = await axios.post("/submit_code", query);
  const id = JSON.parse(response.data.data)["task_id"];

  // TODO: update database

  res.json({
    success: true,
    id: id,
  });
}
