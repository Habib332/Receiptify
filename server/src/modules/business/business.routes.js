const express = require("express");
const router = express.Router();
const businessController = require("./business.controller");
const authMiddleware = require("../../middleware/auth.middleware");

// Order matters: /stats must come before /:id-style routes if any get added
// later, otherwise Express would try to treat "stats" as an :id param.
router.get("/stats", authMiddleware, businessController.getDashboardStats);
router.get("/", authMiddleware, businessController.listBusinesses);
router.post("/", authMiddleware, businessController.createBusiness);

// No allowRoles(...) here on purpose: role must be checked per-business via
// a business_users lookup (done in business.service.js), not read off the
// sessionToken — the token's role reflects whichever business the user
// last selected, which may not be the businessId in this URL.
router.patch("/:businessId", authMiddleware, businessController.updateBusiness);
router.delete(
  "/:businessId",
  authMiddleware,
  businessController.deleteBusiness,
);

module.exports = router;
