const express = require("express");
const router = express.Router();
const businessController = require("./business.controller");
const authMiddleware = require("../../middleware/auth.middleware");

router.post("/", authMiddleware, businessController.createBusiness);

module.exports = router;
