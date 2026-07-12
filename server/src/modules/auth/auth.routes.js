const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const validate = require("../../middleware/validate.middleware");
const authValidation = require("./auth.validation");
const googleRoutes = require("./google.routes");

router.post(
  "/register",
  validate(authValidation.register),
  authController.register,
);
router.post("/login", validate(authValidation.login), authController.login);
router.post(
  "/select-business",
  authMiddleware,
  validate(authValidation.selectBusiness),
  authController.selectBusiness,
);

// GET, no body to validate — just reads req.user from the token
router.get("/me", authMiddleware, authController.getMe);

// Mounted at /api/auth/google, /api/auth/google/callback, /api/auth/google/exchange
router.use("/google", googleRoutes);

module.exports = router;
