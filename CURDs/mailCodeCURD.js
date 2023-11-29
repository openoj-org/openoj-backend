
const { querySql, queryOne, modifySql } = require('../utils/index');

function select_mail_code_by_mail(mail) {
	return querySql(`SELECT * FROM mail_codes WHERE mail = ${mail};`)
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

function select_mail_code_by_id(id) {
	return querySql(`SELECT * FROM mail_codes WHERE mail_code_id = ${id};`)
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

function insert_mail_code(mail, code_number) {
	let sql = `INSERT INTO mail_codes(mail, mail_code_number) \
	           VALUES('${mail}', ${code_number}));`;
	return querySql(sql)
	.then(result => {
		return {
			success: result.affectedRows != 0,
			message: (result.affectedRows != 0) ? '添加验证码成功' : '添加验证码失败',
			// 自动生成的验证码 id
			id: result.insertId
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
	let sql = `UPDATE mail_codes SET mail_code_number = ${code_number}, \
	           mail_code_generate_time = ${new Date().getTime()} \
			   WHERE mail_code_id = ${id};`;
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
	return querySql(`DELETE FROM mail_codes WHERE mail_code_id = ${id};`)
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
	// 按 id 查询邮箱验证码
	select_mail_code_by_id,
	// 按邮箱查询邮箱验证码
	select_mail_code_by_mail,
	// 插入邮箱验证码 (已经在后端生成)
	insert_mail_code,
	// 更新邮箱验证码
	update_mail_code,
	// 删除邮箱验证码
	delete_mail_code
};