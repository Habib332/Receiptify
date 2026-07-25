const crypto = require("crypto");
const passwordResetRepository = require("./passwordReset.repository");
const { sendPasswordResetEmail } = require("../../utils/mailer");
const { hashPassword } = require("../../utils/password");
const ApiError = require("../../utils/apiError");

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// SHA-256 is enough here — the token is already a 32-byte random value
// (high entropy, unguessable), not a low-entropy secret like a password,
// so we don't need bcrypt's slow hashing for it. bcrypt (via hashPassword)
// is reserved for the actual new password below, same as signup.
function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

// Step 1: user submits their email.
// Response is identical whether or not the email exists, and whether or
// not the account uses Google auth — this is what stops the endpoint
// being used to enumerate registered emails or auth providers.
async function requestPasswordReset({ email }) {
  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await passwordResetRepository.findUserByEmail(email);

  // Google-auth accounts have no password_hash to reset — silently skip
  // sending an email rather than erroring, so this doesn't leak which
  // provider an account uses.
  if (user && user.auth_provider === "local") {
    await passwordResetRepository.invalidateActiveTokensForUser(user.user_id);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await passwordResetRepository.createResetToken({
      userId: user.user_id,
      tokenHash,
      expiresAt,
    });

    const resetUrl = `${FRONTEND_URL}/reset-password?token=${rawToken}`;

    try {
      await sendPasswordResetEmail({ to: user.email, resetUrl });
    } catch (err) {
      // Don't let an email-provider hiccup surface to the client or change
      // the response shape — log server-side and continue.
      console.error("Failed to send password reset email:", err);
    }
  }

  return {
    message: "If an account exists for that email, a reset link has been sent.",
  };
}

// Step 2: user submits token + new password.
async function confirmPasswordReset({ token, newPassword }) {
  if (!token || !newPassword) {
    throw new ApiError(400, "Token and new password are required");
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters");
  }

  const tokenHash = hashToken(token);
  const reset =
    await passwordResetRepository.findValidResetByTokenHash(tokenHash);

  if (!reset) {
    throw new ApiError(400, "This reset link is invalid or has expired");
  }

  const passwordHash = await hashPassword(newPassword);

  await passwordResetRepository.updateUserPassword({
    userId: reset.user_id,
    passwordHash,
  });

  // Mark used only after the password update succeeds, so a failure above
  // doesn't burn the token without actually resetting anything.
  await passwordResetRepository.markResetUsed(reset.reset_id);

  return { message: "Password has been reset. You can now log in." };
}

module.exports = { requestPasswordReset, confirmPasswordReset };
