const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const googleRoutes = require("./google.routes");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/select-business", authMiddleware, authController.selectBusiness);
router.get('/me', authMiddleware, authController.getMe);

// Mounted at /api/auth/google, /api/auth/google/callback, /api/auth/google/exchange
router.use("/google", googleRoutes);

module.exports = router;
