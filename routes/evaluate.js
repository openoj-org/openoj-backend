const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const service = require("../services/evaluateService");

router.get("/evaluation/get-recommend", service.get_recommend);

router.get("/evaluate/get-evalue", service.get_evalue);

router.get("/evaluation/recommend", service.recommend);

router.get("/evaluation/edit-tag", service.edit_tag);

router.get("/evaluate/evalue", service.evalue);

module.exports = router;
