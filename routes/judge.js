const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const service = require("../services/judgeService");

router.get("/judge/list", service.list);

router.get("/judge/info-data", service.info_data);

router.get("/judge/info-subtask", service.info_subtask);

router.get("/judge/info", service.info);

router.post("/judge/submit", service.submit);

module.exports = router;
