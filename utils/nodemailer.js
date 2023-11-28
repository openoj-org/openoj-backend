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
    transporter.sendMail(mail, function(error, info){
        if(error) {
            return {
                success: false,
                message: error
            };
        }
        return {
            success: true,
            message: info.response
        }
    });
};