const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const multer = require('multer');

const service = require('../services/problemService');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


// 获取题目样例文件
router.get('/problem/samples', service.problem_samples);

// 获取题目列表
router.get('/problem/list', service.problem_list);

// 获取题目信息
router.get('/problem/info', service.problem_info);

// 删除题目
router.post('/problem/delete', service.problem_delete);

// 用文件修改题目
router.post('/problem/change-by-file', upload.single('data'), service.problem_change_by_file);

// 修改题目数据
router.post('/problem/change-data', upload.single('data'), service.problem_change_data);

// 修改题目元数据
router.post('/problem/change-meta', service.problem_change_meta);

// 用文件创建题目
router.post('/problem/create-by-file', upload.single('data'), service.problem_create_by_file);

// 创建题目
router.post('/problem/create', service.problem_create);

module.exports = router;

