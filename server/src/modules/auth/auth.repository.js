const crypto = require("crypto");
const pool = require("../../config/database");

async function createUser({ name, email, passwordHash }) {
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, auth_provider)
     VALUES ($1, $2, $3, 'local')
     RETURNING user_id, name, email, created_at`,
    [name, email, passwordHash],
  );
  return result.rows[0];
}

async function findUserByEmail(email) {
  const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [
    email,
  ]);
  return result.rows[0];
}

async function findUserById(userId) {
  const result = await pool.query(
    `SELECT user_id, name, email, created_at FROM users WHERE user_id = $1`,
    [userId],
  );
  return result.rows[0];
}

async function getUserBusinesses(userId) {
  const result = await pool.query(
    `SELECT b.business_id, b.name, b.type, b.logo_url, bu.role
     FROM business_users bu
     JOIN businesses b ON b.business_id = bu.business_id
     WHERE bu.user_id = $1
     ORDER BY bu.joined_at ASC`,
    [userId],
  );
  return result.rows;
}

async function getUserRoleForBusiness({ userId, businessId }) {
  const result = await pool.query(
    `SELECT role FROM business_users WHERE user_id = $1 AND business_id = $2`,
    [userId, businessId],
  );
  return result.rows[0];
}

// ---- Google OAuth ----

async function findUserByGoogleId(googleId) {
  const result = await pool.query(`SELECT * FROM users WHERE google_id = $1`, [
    googleId,
  ]);
  return result.rows[0];
}

async function createGoogleUser({ name, email, googleId, avatarUrl }) {
  const result = await pool.query(
    `INSERT INTO users (name, email, google_id, auth_provider, avatar_url)
     VALUES ($1, $2, $3, 'google', $4)
     RETURNING user_id, name, email, created_at, google_id, avatar_url, auth_provider`,
    [name, email, googleId, avatarUrl],
  );
  return result.rows[0];
}

// Links a Google identity to an existing local-password account (matched by
// verified email). Does not touch password_hash or auth_provider, so the
// user keeps both sign-in methods available.
async function linkGoogleAccount({ userId, googleId, avatarUrl }) {
  const result = await pool.query(
    `UPDATE users
     SET google_id = $2, avatar_url = COALESCE(avatar_url, $3)
     WHERE user_id = $1
     RETURNING user_id, name, email, created_at, google_id, avatar_url, auth_provider`,
    [userId, googleId, avatarUrl],
  );
  return result.rows[0];
}

// ---- One-time OAuth exchange codes ----
// Bridges the backend's Google callback (a browser redirect, can't return
// JSON) to the frontend (which needs the identityToken via a normal POST
// response, not a URL). See auth flow docs in google.service.js.

async function createExchangeCode({ userId, identityToken, ttlSeconds = 60 }) {
  const code = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  await pool.query(
    `INSERT INTO oauth_exchange_codes (code, user_id, identity_token, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [code, userId, identityToken, expiresAt],
  );

  return code;
}

// Atomically claims a code: only succeeds if it exists, is unexpired, and
// hasn't been used yet. Marking used_at in the same query prevents a race
// where the code is redeemed twice.
async function consumeExchangeCode(code) {
  const result = await pool.query(
    `UPDATE oauth_exchange_codes
     SET used_at = NOW()
     WHERE code = $1
       AND used_at IS NULL
       AND expires_at > NOW()
     RETURNING user_id, identity_token`,
    [code],
  );
  return result.rows[0];
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  getUserBusinesses,
  getUserRoleForBusiness,
  findUserByGoogleId,
  createGoogleUser,
  linkGoogleAccount,
  createExchangeCode,
  consumeExchangeCode,
};
