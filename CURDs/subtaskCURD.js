const { insert_one_decorator } = require('./decorator');

function insert_subtask(problem_id, problem_is_official, number, score) {
    let sql = 'INSERT INTO subtasks(problem_id, problem_is_official, \
               subtask_number, subtask_score) VALUES(?, ?, ?, ?);'
    let sqlParams = [problem_id, problem_is_official, number, score];
    return insert_one_decorator(sql, sqlParams, '子任务');
}


module.exports = {
    insert_subtask
};