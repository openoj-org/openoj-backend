const { insert_one_decorator } = require("./decorator");

function insert_subtask(problem_id, problem_is_official, number, score) {
  let sql =
    "INSERT INTO subtasks(problem_id, problem_is_official, \
               subtask_number, subtask_score) VALUES(?, ?, ?, ?);";
  let sqlParams = [problem_id, problem_is_official, number, score];
  return insert_one_decorator(sql, sqlParams, "子任务");
}

// 根据题目id，返回一个数组，数组的每个元素描述一个subtask，键值包含id（子任务id）、score（子任务分值），请按照子任务编号递增的顺序给出
function select_subtask_by_problem_id(problem_id, problem_is_official) {
  // TODO
}

/**
 * 根据problem id，删除所有相关的subtask的信息
 * @date 2023/12/23 - 17:10:06
 * @author Mr_Spade
 *
 * @param {*} problem_id
 * @param {*} problem_is_official
 */
function delete_subtask_by_problem_id(problem_id, problem_is_official) {
  // TODO
}

module.exports = {
  insert_subtask,
  select_subtask_by_problem_id,
  delete_subtask_by_problem_id,
};
