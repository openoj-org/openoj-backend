
const { querySql, queryOne, modifySql, toQueryString } = require('../utils/index');

function select_official_tags_by_id(id) {
	let sql = 'SELECT * FROM tags WHERE problem_id = ' + id +
	          ' AND problem_is_official = 1;';
	return querySql(sql)
	.then(result => {
		let flag = result && (result.length > 0);
		return {
			success: flag,
			message: (flag ? '标签查询成功' : '标签不存在'),
			tags: (flag ?
				result.map(tag => tag.tag_name) :
				undefined)
		};
	})
	.catch(err => {
		return {
			success: false,
			message: err.message
		};
	});
}

function select_official_problem_by_id(id) {
	let sql = 'SELECT * FROM official_problems WHERE problem_id = ' + id + ';';
	return querySql(sql)
	.then(result => {
		let flag = result && (result.length > 0);
		return {
			success: flag,
			message: (flag ? '题目查询成功' : '题目不存在'),
			title: (flag ? result[0].problem_name : undefined),
			titleEn: (flag ? result[0].problem_english_name : undefined),
			source: (flag ? result[0].problem_source : undefined),
			submit: (flag ? result[0].problem_submit_number : undefined),
			pass: flag ?
				  (result[0].problem_submit_number == 0 ?
				   0 : (result[0].problem_pass_number / result[0].problem_submit_number)) :
				  undefined,
			grade: flag ?
			       (result[0].problem_grade_number == 0 ?
					0 : (result[0].problem_grade_sum / result[0].problem_grade_number)) :
				   undefined,
			type: (flag ? result[0].problem_type : undefined),
			timeLimit: (flag ? result[0].problem_time_limit : undefined),
			memoryLimit: (flag ? result[0].problem_memory_limit : undefined),
			background: (flag ? result[0].problem_background : undefined),
			statement: (flag ? result[0].problem_description : undefined),
			inputStatement: (flag ? result[0].problem_input_format : undefined),
			outputStatement: (flag ? result[0].problem_output_format : undefined),
			rangeAndHint: (flag ? result[0].problem_data_range_and_hint : undefined)
		};
	})
	.catch(err => {
		return {
			success: false,
			message: err.message
		};
	});
}

function select_problems_by_param_order(
	order, increase, titleKeyword, sourceKeyword, start, end
) {
	let sql = 'SELECT * FROM official_problems WHERE problem_name LIKE "';
	sql += (titleKeyword + '%" AND problem_source LIKE "');
	sql += (sourceKeyword + '%" ORDER BY ');
	sql += ((order == 'grade') ?
	        '(problem_grade_sum / (problem_grade_number + 1))' :
			order);
	sql += (increase ? ' ASC ' : ' DESC ');
	if (start && end) {
		sql += ('LIMIT ' + start + ', ' + end);
	}
	return querySql(sql)
	.then(probs => {
		if (!probs || probs.length == 0) {
			return {
				success: false,
				message: '指定范围内题目不存在',
				count: 0,
				result: null
			};
		} else {
			return {
				success: true,
				message: '用户列表查询成功',
				count: probs.length,
				result: probs.map(prob => ({
					id: prob.problem_id,
					title: prob.problem_name,
					source: prob.problem_source,
					submit: prob.problem_submit_number,
					pass: ((prob.problem_submit_number == 0) ? 0 :
					       (prob.problem_pass_number / prob.problem_submit_number)),
					grade: ((prob.problem_grade_number == 0) ? 0 :
					        (prob.problem_grade_sum / prob.problem_grade_number))
				}))
			};
		}
	})
	.catch(e => {
		return {
			success: false,
			message: e.message
		}
	});
}

function insert_problem(
	id, title, titleEn, type, timeLimit, memoryLimit,
	background, statement, inputStatement,
	outputStatement, rangeAndHint, source) {
	let sql = 'INSERT INTO official_problems(problem_id, problem_name, \
		       problem_english_name, problem_type, problem_time_limit, \
			   problem_memory_limit, problem_background, problem_description, \
			   problem_input_format, problem_output_format, \
			   problem_range_and_hint, problem_source) ' + 
			  `VALUES('${id}', '${title}', '${titleEn}', '${type}', \
			          '${timeLimit}', '${memoryLimit}', '${background}', \
					  '${statement}', '${inputStatement}', '${outputStatement}', \
					  '${rangeAndHint}', '${source}');`;
	return querySql(sql)
	.then(result => {
		return {
			success: result.affectedRows != 0,
			message: (result.affectedRows != 0) ? '添加题目成功' : '添加题目失败'
		};
	})
	.catch(err => {
		return {
			success: false,
			message: err.message
		};
	});
}

function update_problem(id, param, value) {
    let sql = ('UPDATE official_problems SET ' + param + ' = ' +
	           value + ' WHERE problem_id = ' + id);
	return querySql(sql)
	.then(result => {
		return {
			success: result.affectedRows != 0,
			message: (result.affectedRows != 0) ? `${param} 更新成功` : '用户不存在'
		};
	})
	.catch(err => {
		return {
			success: false,
			message: err.message
		};
	});
}

function delete_problem(id) {
	return querySql(`DELETE FROM official_problems WHERE problem_id = '${id}';`)
	.then(result => {
		return {
			success: result.affectedRows != 0,
			message: (result.affectedRows != 0) ? '题目删除成功' : 'id 无效'
		};
	})
	.catch(err => {
		return {
			success: false,
			message: err.message
		};
	});
}

module.exports = {
	/* 参数: id               // int, 表示题目 id
	 * 作用: 返回包含表示题目标签查询结果的一个对象 {
	 * 　　      // 以下为必有项
	 * 　　      success,         // bool, 表示更新是否成功
	 * 　　      message,         // string, 表示返回的消息
     * 　　      // 以下为 success = true 时存在项
     * 　　      tags             // array, 表示题目标签的列表
	 * 　　       -> tags[i]          // string, 表示标签
	 * 　　  } 的 Promise 对象
	 */
	select_official_tags_by_id,
	/* 参数: id               // int, 表示题目 id
	 * 作用: 返回包含表示题目信息查询结果的一个对象 {
	 * 　　      // 以下为必有项
	 * 　　      success,         // bool, 表示更新是否成功
	 * 　　      message,         // string, 表示返回的消息
     * 　　      // 以下为 success = true 时存在项
	 * 　　      title,           // string, 表示题目的标题
	 *  　　     titleEn,         // string, 表示题目的英文标题
	 *  　　     source,          // string, 表示题目的来源
	 *  　　     submit,          // int, 表示题目的提交数
	 *  　　     pass,            // double, 表示题目的通过率
	 *  　　     grade,           // double, 表示题目的评分
	 *  　　     type,            // int, 表示题目类型
	 *  　　     timeLimit,       // int, 表示题目时间限制的毫秒数
	 *   　　    memoryLimit,     // int, 表示题目空间限制的 MB 数
	 *   　　    background,      // string, 表示题目的背景
	 *   　　    statement,       // string, 表示题目的陈述
	 *   　　    inputStatement,  // string, 表示题目的输入格式
	 *   　　    outputStatement, // string, 表示题目的输出格式
	 *   　　    rangeAndHint     // string, 表示题目的数据范围和提示
	 * 　　  } 的 Promise 对象, 缺少 score, tags 和 samples
	 */
    select_official_problem_by_id,
	/* 参数: order,            // string, 'id'/'title'/'grade'
	 * 　　                    // 表示 id/标题/评分 字段
	 * 　　  increase,         // bool, 表示 升/降 序排列
	 * 　　  titleKeyword,     // string, 如有则表示标题中含此关键词
	 * 　　  sourceKeyword,    // string, 如有则表示来源中含此关键词
	 * 　　  start,            // int, 返回列表头在所有结果中索引
	 * 　　  end               // int, 返回列表尾在所有结果中索引
	 * 作用: 返回包含表示题目列表查询结果的一个对象 {
	 * 　　      // 以下为必有项
	 * 　　      success,       // bool, 表示更新是否成功
	 * 　　      message,       // string, 表示返回的消息
     * 　　      // 以下为 success = true 时存在项
	 * 　　      result,        // array, 表示题目列表
	 * 　　       -> result[i]      // object, 表示题目信息的一个对象 {
	 * 　　              // 以下为必有项
	 * 　　              id,            // int, 表示题目 id
	 * 　　              title,         // string, 表示题目的标题
	 * 　　              submit,        // int, 表示题目的提交数
     * 　　              pass,          // double, 表示题目的通过率
	 * 　　              source,        // string, 表示题目的来源
	 * 　　              grade          // double, 表示题目的评分
	 * 　　          }              // 缺少 score 和 tags
	 * 　　      count          // int, 表示题目数
	 * 　　  } 的 Promise 对象
	 */
    select_problems_by_param_order,
    // 创建题目
    insert_problem,
    // 修改题目
    update_problem,
    // 删除题目
    delete_problem
    
};