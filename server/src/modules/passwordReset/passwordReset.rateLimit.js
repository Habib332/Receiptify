const rateLimit = require("express-rate-limit");

// Scoped to /forgot-password specifically (not /reset-password — that one
// is already gated by a token that's hard to guess, so brute-forcing it
// isn't the same risk as this one).
//
// Keyed by IP by default. 5 requests per 15 minutes is generous enough
// that a real user retrying a typo'd email won't get blocked, but tight
// enough to stop inbox-spamming or timing-based email enumeration.
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true, // adds RateLimit-* response headers
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many reset requests. Please try again later.",
  },
});

module.exports = { forgotPasswordLimiter };
