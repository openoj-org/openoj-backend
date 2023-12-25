const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const service = require("../services/evaluateService");

router.get("/evaluate/get-recommend", service.get_recommend);

router.get("/evaluate/get-evalue", service.get_evalue);

router.post("/evaluate/recommend", service.recommend);

router.post("/evaluate/edit-tag", service.edit_tag);

router.post("/evaluate/evalue", service.evalue);

module.exports = router;
