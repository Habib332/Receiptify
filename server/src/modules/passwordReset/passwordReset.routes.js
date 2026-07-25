const express = require("express");
const router = express.Router();
const passwordResetController = require("./passwordReset.controller");
const { forgotPasswordLimiter } = require("./passwordReset.rateLimit");

// Rate limit the forgot-password endpoint to prevent abuse and email enumeration
router.post("/forgot-password", forgotPasswordLimiter, passwordResetController.forgotPassword);
// No authMiddleware on either route — the user isn't logged in yet, that's
// the whole point of this flow. Same reasoning as register/login in
// auth.routes.js.
router.post("/reset-password", passwordResetController.resetPassword);
module.exports = router;
