const nodemailer = require('nodemailer');

//创建一个smtp服务器
const config = {
    host: 'smtp.163.com',
    port: 465,
    auth: {
        user: 'zxbzxb20@163.com',
        pass: 'QXVNWDGQROUUWARS'
    }
};
// 创建一个SMTP客户端对象
const transporter = nodemailer.createTransport(config);

//发送邮件
module.exports = function (mail){
    return new Promise((resolve, reject) => {
        try {
            transporter.sendMail(mail, function(error, info){
                if(error) {
                    reject({success: false, message: error.message});
                } else {
                    resolve({success: true});
                }
            });
        } catch (e) {
            reject({success: false, message: e.message});
        }});
};