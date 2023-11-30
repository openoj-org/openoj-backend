
const { querySql, queryOne, modifySql } = require('../utils/index');

// function select_mail_code_by_session(id) {
// 	return querySql(`SELECT * FROM mail_sessions WHERE mail_session_id = '${id}';`)
// 	.then(sessions => {
// 		if (!sessions || sessions.length == 0) {
// 			return {
// 				success: false,
// 				message: '无效会话'
// 			};
// 		} else {
// 			return {
// 				success: true,
// 				message: '获取邮箱会话成功',
// 				mailCodeId: sessions[0].mail_code_id
// 			}
// 		}
// 	});
// }

function select_mail_code_by_mail(mail) {
	return querySql(`SELECT * FROM mail_sessions WHERE mail = ${mail};`)
	.then(mailCodes => {
		if (!mailCodes || mailCodes.length == 0) {
			return {
				success: false,
				message: '验证码不存在'
			};
		} else {
			let mailCode = mailCodes[0];
			return {
				success: true,
				message: '获取邮箱验证码成功',
				// 验证码 id
				id: mailCode.mail_code_id,
				// 验证码生成后经过的毫秒数
				generateTime: new Date().getTime() - mailCode.mail_code_generate_time,
				// 验证码内容
				code_number: mailCode.mail_code_number
			};
		}
	})
	.catch(err => {
		return {
			success: false,
			message: err.message
		};
	});
}

function update_mail_code_success_session_id(id, success_id) {
	let sql = `UPDATE mail_sessions SET mail_success_session_id = \
	           '${success_id}' WHERE mail_session_id = '${id}';`;
	return querySql(sql)
	.then(result => {
		return {
			success: result.affectedRows != 0,
			message: (result.affectedRows != 0) ? '更新会话成功' : '更新会话失败',
		};
	})
	.catch(err => {
		return {
			success: false,
			message: err.message
		};
	});
}

function select_mail_code_by_session_id(id) {
	return querySql(`SELECT * FROM mail_sessions WHERE mail_session_id = '${id}';`)
	.then(mailCodes => {
		if (!mailCodes || mailCodes.length == 0) {
			return {
				success: false,
				message: '验证码不存在'
			};
		} else {
			let mailCode = mailCodes[0];
			return {
				success: true,
				message: '获取邮箱验证码成功',
				// 验证码生成后经过的毫秒数
				generateTime: new Date().getTime() - mailCode.mail_code_generate_time,
				// 验证码对应邮箱
				mail: mailCode.mail,
				// 验证码内容
				code_number: mailCode.mail_code_number,
				// 会话场景
				scene: mailCode.mail_session_scene
			};
		}
	})
	.catch(err => {
		return {
			success: false,
			message: err.message
		};
	});
}

function select_mail_code_by_success_session_id(id) {
	return querySql(`SELECT * FROM mail_sessions WHERE mail_success_session_id = '${id}';`)
	.then(mailCodes => {
		if (!mailCodes || mailCodes.length == 0) {
			return {
				success: false,
				message: '会话不存在'
			};
		} else {
			let mailCode = mailCodes[0];
			return {
				success: true,
				message: '获取会话成功',
				// 验证码生成后经过的毫秒数
				generateTime: new Date().getTime() - mailCode.mail_code_generate_time,
				// 验证码对应邮箱
				mail: mailCode.mail,
				// 会话场景
				scene: mailCode.mail_session_scene
			};
		}
	})
	.catch(err => {
		return {
			success: false,
			message: err.message
		};
	});
}

function insert_mail_code(session_id, mail, code_number, scene) {
	let sql = `INSERT INTO mail_sessions(mail_session_id, mail, \
		       mail_code_number, mail_session_scene) \
	           VALUES('${session_id}', '${mail}',
			   '${code_number}', ${scene});`;
	return querySql(sql)
	.then(result => {
		return {
			success: result.affectedRows != 0,
			message: (result.affectedRows != 0) ? '添加验证码成功' : '添加验证码失败'
		};
	})
	.catch(err => {
		return {
			success: false,
			message: err.message
		};
	});
}

function update_mail_code(id, code_number) {
	let sql = `UPDATE mail_sessions SET mail_code_number = ${code_number}, \
	           mail_code_generate_time = ${new Date().getTime()} \
			   WHERE mail_session_id = ${id};`;
	return querySql(sql)
	.then(result => {
		return {
			success: result.affectedRows != 0,
			message: (result.affectedRows != 0) ? `验证码更新成功` : '验证码不存在'
		};
	})
	.catch(err => {
		return {
			success: false,
			message: err.message
		};
	});
}

function delete_mail_code(id)
{
	return querySql(`DELETE FROM mail_sessions WHERE mail_session_id = ${id};`)
	.then(result => {
		return {
			success: result.affectedRows != 0,
			message: (result.affectedRows != 0) ? '删除验证码成功' : '验证码不存在'
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
	// 更新成功后的会话 id
	update_mail_code_success_session_id,
	// 按 sessionId 查询邮箱验证码
	select_mail_code_by_session_id,
	// 按成功后的会话 id 查询邮箱验证码
	select_mail_code_by_success_session_id,
	// 按邮箱查询邮箱验证码
	select_mail_code_by_mail,
	// 插入邮箱验证码 (已经在后端生成)
	insert_mail_code,
	// 更新邮箱验证码
	update_mail_code,
	// 删除邮箱验证码
	delete_mail_code
};