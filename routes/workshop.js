const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const service = require('../services/workshopService');



// 获取题目样例文件
router.get('/workshop/samples', service.workshop_samples);

// 获取题目列表
router.get('/workshop/list', service.workshop_list);

// 获取题目信息
router.get('/workshop/info', service.workshop_info);

// 引入题目
router.post('/workshop/import', service.workshop_import);

// 删除题目
router.post('/workshop/delete', service.workshop_delete);

// 用文件修改题目
router.post('/workshop/change-by-file', service.workshop_change_by_file);

// 修改题目数据
router.post('/workshop/change-data', service.workshop_change_data);

// 修改题目元数据
router.post('/workshop/change-meta', service.workshop_change_meta);

// 用文件创建题目
router.post('/workshop/create-by-file', service.workshop_create_by_file);

// 创建题目
router.post('/workshop/create', service.workshop_create);

module.exports = router;

