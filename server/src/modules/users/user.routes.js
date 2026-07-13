const express = require("express");
const router = express.Router();
const userController = require("./user.controller");
const authMiddleware = require("../../middleware/auth.middleware");

// GET /api/users/me/profile
// No :id param on purpose — this route only ever returns the caller's own
// profile (see user.controller.js), so there's nothing here to authorize
// beyond "is this a valid, logged-in user", which authMiddleware covers.
router.get("/me/profile", authMiddleware, userController.getMyProfile);

module.exports = router;
