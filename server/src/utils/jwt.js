const jwt = require("jsonwebtoken");
const env = require("../config/env");

function generateToken(payload) {
  // payload should be minimal: e.g. { userId, businessId, role }
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret); // throws if invalid/expired
}

module.exports = { generateToken, verifyToken };
