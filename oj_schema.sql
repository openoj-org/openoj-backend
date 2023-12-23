/*
 Navicat Premium Data Transfer

 Source Server         : mysql
 Source Server Type    : MySQL
 Source Server Version : 80035
 Source Host           : localhost:3306
 Source Schema         : oj_schema

 Target Server Type    : MySQL
 Target Server Version : 80035
 File Encoding         : 65001

 Date: 23/12/2023 12:28:55
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for cookies
-- ----------------------------
DROP TABLE IF EXISTS `cookies`;
CREATE TABLE `cookies`  (
  `user_id` int UNSIGNED NOT NULL,
  `cookie` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for data
-- ----------------------------
DROP TABLE IF EXISTS `data`;
CREATE TABLE `data`  (
  `data_id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '测试数据（样例）id，随机生成的非重复正整数',
  `problem_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '样例对应问题 id',
  `problem_is_official` tinyint NULL DEFAULT NULL,
  `data_attribute` enum('non_sample','visible_sample','hidden_sample') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'hidden_sample' COMMENT '样例属性，为 3 种枚举值之一',
  `subtask_number` int NOT NULL DEFAULT 0 COMMENT '样例对应子任务编号',
  `testpoint_number` int NULL DEFAULT 0 COMMENT '样例对应测试点编号',
  `data_input_filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '样例的原输入文件名',
  `data_output_filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '样例的原输出文件名',
  `data_score` int UNSIGNED NOT NULL DEFAULT 0 COMMENT '样例的分值',
  PRIMARY KEY (`data_id`) USING BTREE,
  INDEX `question_id`(`problem_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for data_evaluations
-- ----------------------------
DROP TABLE IF EXISTS `data_evaluations`;
CREATE TABLE `data_evaluations`  (
  `data_evaluation_id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '针对样例的评测 id',
  `data_id` int UNSIGNED NOT NULL COMMENT '样例 id',
  `evaluation_id` int UNSIGNED NOT NULL COMMENT '（题目）评测 id',
  `subtask_evaluation_id` int UNSIGNED NULL DEFAULT NULL COMMENT '对应的子任务评测 id，没有取 NULL',
  `data_evaluation_score` int UNSIGNED NULL DEFAULT NULL COMMENT '针对样例的评测得分',
  `data_evaluation_status` enum('AC','WA','TLE','MLE','RE','UKE') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '针对样例的评测状态',
  `data_evaluation_time` int UNSIGNED NULL DEFAULT NULL COMMENT '针对样例的评测所耗时间',
  `data_evaluation_memory` int UNSIGNED NULL DEFAULT NULL COMMENT '针对样例的评测所耗空间',
  PRIMARY KEY (`data_evaluation_id`) USING BTREE,
  INDEX `sample_id`(`data_id` ASC) USING BTREE,
  INDEX `evaluation_id`(`evaluation_id` ASC) USING BTREE,
  INDEX `subtask_evaluation_id`(`subtask_evaluation_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for email_suffixes
-- ----------------------------
DROP TABLE IF EXISTS `email_suffixes`;
CREATE TABLE `email_suffixes`  (
  `email_suffix_id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '邮箱后缀 id',
  `email_suffix` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '邮箱后缀',
  PRIMARY KEY (`email_suffix_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 13 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for evaluations
-- ----------------------------
DROP TABLE IF EXISTS `evaluations`;
CREATE TABLE `evaluations`  (
  `evaluation_id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '评测 id',
  `problem_is_official` tinyint UNSIGNED NOT NULL DEFAULT 1 COMMENT '评测题目是否进入官方题库',
  `problem_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '评测题目 id',
  `user_id` int UNSIGNED NOT NULL COMMENT '评测用户 id',
  `evaluation_language` enum('C++11','Python3') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '评测语言',
  `evaluation_source_filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '评测源文件名',
  `evaluation_score` int UNSIGNED NULL DEFAULT NULL COMMENT '评测分数',
  `evaluation_status` enum('AC','WA','TLE','MLE','RE','UKE') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '评测状态',
  `evaluation_total_time` int UNSIGNED NULL DEFAULT NULL COMMENT '评测总消耗时间',
  `evaluation_total_memory` int UNSIGNED NULL DEFAULT NULL COMMENT '评测总消耗空间',
  `evaluation_submit_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '评测提交时间',
  PRIMARY KEY (`evaluation_id`) USING BTREE,
  INDEX `question_id`(`problem_id` ASC) USING BTREE,
  INDEX `user_id`(`user_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for global_settings
-- ----------------------------
DROP TABLE IF EXISTS `global_settings`;
CREATE TABLE `global_settings`  (
  `global_setting_id` int UNSIGNED NOT NULL DEFAULT 0 COMMENT '全局唯一的设置',
  `allow_register` tinyint NOT NULL DEFAULT 1 COMMENT '是否开放注册',
  `have_list` tinyint NOT NULL DEFAULT 1 COMMENT '是否限制邮箱后缀',
  PRIMARY KEY (`global_setting_id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for mail_sessions
-- ----------------------------
DROP TABLE IF EXISTS `mail_sessions`;
CREATE TABLE `mail_sessions`  (
  `mail_session_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '验证码会话 id',
  `mail` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '邮箱',
  `mail_code_generate_time` bigint NOT NULL DEFAULT 0 COMMENT '验证码生成时间',
  `mail_code_number` char(6) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '验证码内容',
  `mail_success_session_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '成功验证后的会话 id',
  `mail_session_scene` int NULL DEFAULT NULL COMMENT '会话场景',
  PRIMARY KEY (`mail_session_id`) USING BTREE,
  INDEX `mail`(`mail` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for official_problems
-- ----------------------------
DROP TABLE IF EXISTS `official_problems`;
CREATE TABLE `official_problems`  (
  `problem_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '问题 id，随机生成的非重复正整数',
  `problem_name` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '问题名，长度不超过 20',
  `problem_english_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '问题英文名，长度不超过 50',
  `problem_type` enum('traditional','interactive','answer') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'traditional' COMMENT '问题类型，为 3 种枚举值之一',
  `problem_grade_sum` int NULL DEFAULT 0 COMMENT '问题评分总和',
  `problem_grade_number` int NULL DEFAULT 0 COMMENT '问题评分人数',
  `problem_time_limit` int UNSIGNED NOT NULL DEFAULT 1000 COMMENT '问题时间限制',
  `problem_memory_limit` int UNSIGNED NOT NULL DEFAULT 256 COMMENT '问题空间限制',
  `problem_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '问题描述的 Markdown 文本',
  `problem_input_format` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '问题输入格式的 Markdown 文本',
  `problem_output_format` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '问题输出格式的 Markdown 文本',
  `problem_data_range_and_hint` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '问题规模和提示的 Markdown 文本',
  `problem_background` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '问题背景的 Markdown 文本',
  `problem_source` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '问题来源',
  `problem_config_filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '问题配置文件名',
  `problem_submit_time` bigint NULL DEFAULT 0 COMMENT '问题提交时间',
  `problem_submit_number` int NULL DEFAULT 0 COMMENT '问题提交总次数',
  `problem_pass_number` int NULL DEFAULT 0 COMMENT '问题通过总次数',
  `problem_use_subtask` tinyint NULL DEFAULT 1,
  `problem_use_spj` tinyint NULL DEFAULT 1,
  `problem_spj_filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  PRIMARY KEY (`problem_id`) USING BTREE,
  UNIQUE INDEX `problem_id`(`problem_id` ASC) USING BTREE,
  UNIQUE INDEX `problem_english_name`(`problem_english_name` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for posts
-- ----------------------------
DROP TABLE IF EXISTS `posts`;
CREATE TABLE `posts`  (
  `post_id` int UNSIGNED NOT NULL COMMENT '帖子 id',
  `post_title` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '帖子标题，长度不超过 50',
  `post_is_announcement` tinyint UNSIGNED NOT NULL DEFAULT 0 COMMENT '帖子是否为公告',
  `post_is_question_discussion` tinyint NULL DEFAULT NULL COMMENT '帖子是否为题目讨论贴，0 不对应题目，1 对应官方题目，2 对应创意工坊题目',
  `problem_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT '0' COMMENT '帖子对应题目的 id，0 或 NULL 不对应任何题目',
  `post_submit_user_id` int UNSIGNED NULL DEFAULT NULL COMMENT '楼主 id',
  `post_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '帖子内容',
  `post_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '帖子时间',
  PRIMARY KEY (`post_id`) USING BTREE,
  INDEX `question_id`(`problem_id` ASC) USING BTREE,
  INDEX `user_id`(`post_submit_user_id` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ratings
-- ----------------------------
DROP TABLE IF EXISTS `ratings`;
CREATE TABLE `ratings`  (
  `rating_id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '评分 id',
  `problem_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '评分对应题目 id',
  `rating_submit_user_id` int UNSIGNED NULL DEFAULT NULL COMMENT '评分提交用户 id',
  `rating_value` int NOT NULL COMMENT '评分值',
  `problem_is_official` tinyint UNSIGNED NOT NULL COMMENT '评分对应题目是否进入官方题库',
  PRIMARY KEY (`rating_id`) USING BTREE,
  INDEX `group_index`(`problem_id` ASC, `rating_submit_user_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for recommendations
-- ----------------------------
DROP TABLE IF EXISTS `recommendations`;
CREATE TABLE `recommendations`  (
  `recommendation_id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '推荐 id',
  `recommendation_submit_user_id` int UNSIGNED NULL DEFAULT NULL COMMENT '推荐提交用户 id',
  `problem_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '推荐对应的题目 id',
  PRIMARY KEY (`recommendation_id`) USING BTREE,
  INDEX `recommendation_submit_user_id`(`recommendation_submit_user_id` ASC) USING BTREE,
  INDEX `question_id`(`problem_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for replies
-- ----------------------------
DROP TABLE IF EXISTS `replies`;
CREATE TABLE `replies`  (
  `reply_id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '回复 id',
  `post_id` int UNSIGNED NOT NULL COMMENT '回复对应帖子的 id',
  `reply_submit_user_id` int UNSIGNED NULL DEFAULT NULL COMMENT '层主 id',
  `reply_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '回复内容',
  `reply_time` datetime NULL DEFAULT NULL COMMENT '回复时间',
  PRIMARY KEY (`reply_id`) USING BTREE,
  INDEX `post_id`(`post_id` ASC) USING BTREE,
  INDEX `user_id`(`reply_submit_user_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for subtask_evaluations
-- ----------------------------
DROP TABLE IF EXISTS `subtask_evaluations`;
CREATE TABLE `subtask_evaluations`  (
  `subtask_evaluation_id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '针对子任务评测 id',
  `subtask_id` int UNSIGNED NOT NULL COMMENT '子任务 id',
  `evaluation_id` int UNSIGNED NOT NULL COMMENT '（题目）评测 id',
  `subtask_evaluation_score` int UNSIGNED NULL DEFAULT NULL COMMENT '针对子任务评测得分',
  `subtask_evaluation_status` enum('AC','WA','TLE','MLE','RE','UKE') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '针对子任务评测状态',
  PRIMARY KEY (`subtask_evaluation_id`) USING BTREE,
  INDEX `subtask_id`(`subtask_id` ASC) USING BTREE,
  INDEX `evaluation_id`(`evaluation_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for subtasks
-- ----------------------------
DROP TABLE IF EXISTS `subtasks`;
CREATE TABLE `subtasks`  (
  `subtask_id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '子任务 id，随机生成的非重复正整数',
  `problem_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '子任务对应问题 id',
  `subtask_number` int NULL DEFAULT NULL COMMENT '子任务编号',
  `subtask_score` int NULL DEFAULT NULL COMMENT '子任务的分值',
  `problem_is_official` tinyint NOT NULL,
  PRIMARY KEY (`subtask_id`) USING BTREE,
  INDEX `problem_id`(`problem_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tags
-- ----------------------------
DROP TABLE IF EXISTS `tags`;
CREATE TABLE `tags`  (
  `tag_id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '标签 id',
  `tag_name` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '标签名称',
  `problem_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '标签对应题目 id',
  `problem_is_official` tinyint UNSIGNED NOT NULL COMMENT '标签对应题目是否进入官方题库',
  PRIMARY KEY (`tag_id`) USING BTREE,
  INDEX `problem_id`(`problem_id` ASC) USING BTREE,
  FULLTEXT INDEX `tag_name`(`tag_name`)
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users`  (
  `user_id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户 id，随机生成的非重复数字',
  `user_name` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户名，长度为 3-20 的非重复字符串',
  `user_password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户密码的哈希值，原密码必须为 6-20 位数字',
  `user_email` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户邮箱，长度不超过 50 的合法邮箱',
  `user_role` int NOT NULL DEFAULT 3 COMMENT '用户角色，为 5 种枚举值之一',
  `user_signature` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT '' COMMENT '用户签名，长度不超过 100',
  `user_register_time` bigint UNSIGNED NOT NULL DEFAULT 0 COMMENT '用户注册时间',
  `user_email_change_time` bigint UNSIGNED NOT NULL DEFAULT 0 COMMENT '用户上次修改邮箱时间',
  `user_name_change_time` bigint UNSIGNED NOT NULL DEFAULT 0 COMMENT '用户上次修改名称时间',
  `user_pass_number` int UNSIGNED NOT NULL DEFAULT 0 COMMENT '用户通过题数',
  PRIMARY KEY (`user_id`) USING BTREE,
  UNIQUE INDEX `user_name`(`user_name` ASC) USING BTREE,
  UNIQUE INDEX `user_email`(`user_email` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 68 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for workshop_problems
-- ----------------------------
DROP TABLE IF EXISTS `workshop_problems`;
CREATE TABLE `workshop_problems`  (
  `problem_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '问题 id，随机生成的非重复正整数',
  `problem_name` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '问题名，长度不超过 20',
  `problem_english_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '问题英文名，长度不超过 50',
  `problem_type` enum('traditional','interactive','answer') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'traditional' COMMENT '问题类型，为 3 种枚举值之一',
  `problem_grade_sum` int NULL DEFAULT 0 COMMENT '问题评分总和',
  `problem_grade_number` int NULL DEFAULT 0 COMMENT '问题评分人数',
  `problem_time_limit` int UNSIGNED NOT NULL DEFAULT 1000 COMMENT '问题时间限制',
  `problem_memory_limit` int UNSIGNED NOT NULL DEFAULT 256 COMMENT '问题空间限制',
  `problem_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '问题描述的 Markdown 文本',
  `problem_input_format` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '问题输入格式的 Markdown 文本',
  `problem_output_format` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '问题输出格式的 Markdown 文本',
  `problem_data_range_and_hint` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '问题规模和提示的 Markdown 文本',
  `problem_background` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '问题背景的 Markdown 文本',
  `problem_source` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '问题来源',
  `problem_config_filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '问题配置文件名',
  `problem_submit_user_id` int UNSIGNED NULL DEFAULT NULL COMMENT '问题提交用户 id',
  `problem_submit_time` bigint NULL DEFAULT 0 COMMENT '问题提交时间',
  `problem_submit_number` int NULL DEFAULT 0 COMMENT '问题提交总次数',
  `problem_pass_number` int NULL DEFAULT 0 COMMENT '问题通过总次数',
  PRIMARY KEY (`problem_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;
