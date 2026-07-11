const express = require("express");
const router = express.Router();
const businessController = require("./business.controller");
const authMiddleware = require("../../middleware/auth.middleware");

// Order matters: /stats must come before /:id-style routes if any get added
// later, otherwise Express would try to treat "stats" as an :id param.
router.get("/stats", authMiddleware, businessController.getDashboardStats);
router.get("/", authMiddleware, businessController.listBusinesses);
router.post("/", authMiddleware, businessController.createBusiness);

module.exports = router;
