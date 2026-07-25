const passwordResetService = require("./passwordReset.service");

// POST /api/password-reset/forgot-password
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const result = await passwordResetService.requestPasswordReset({
      email,
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// POST /api/password-reset/reset-password
async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    const result = await passwordResetService.confirmPasswordReset({
      token,
      newPassword,
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { forgotPassword, resetPassword };
