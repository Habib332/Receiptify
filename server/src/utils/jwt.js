const jwt = require("jsonwebtoken");
const env = require("../config/env");

// Identity token: proves who you are, nothing else. Short-lived, used only to select a business.
function generateIdentityToken(payload) {
  // payload: { userId }
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "15m" });
}

// Session token: full access token, scoped to one business + role.
function generateSessionToken(payload) {
  // payload: { userId, businessId, role }
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

module.exports = { generateIdentityToken, generateSessionToken, verifyToken };
