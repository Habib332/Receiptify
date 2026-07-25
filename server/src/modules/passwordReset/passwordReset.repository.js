const pool = require("../../config/database");

async function findUserByEmail(email) {
  const result = await pool.query(
    `SELECT user_id, name, email, auth_provider FROM users WHERE LOWER(email) = LOWER($1)`,
    [email],
  );
  return result.rows[0];
}

// Any unused, unexpired rows for this user — called before issuing a new
// token so a fresh request invalidates older ones instead of leaving
// multiple valid reset links alive at once.
async function invalidateActiveTokensForUser(userId) {
  await pool.query(
    `UPDATE password_resets
     SET used_at = NOW()
     WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW()`,
    [userId],
  );
}

async function createResetToken({ userId, tokenHash, expiresAt }) {
  const result = await pool.query(
    `INSERT INTO password_resets (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING reset_id, user_id, expires_at, created_at`,
    [userId, tokenHash, expiresAt],
  );
  return result.rows[0];
}

// Valid = exists, not used, not expired. Joins users so the service gets
// the email back in one query rather than two.
async function findValidResetByTokenHash(tokenHash) {
  const result = await pool.query(
    `SELECT pr.reset_id, pr.user_id, u.email
     FROM password_resets pr
     JOIN users u ON u.user_id = pr.user_id
     WHERE pr.token_hash = $1
       AND pr.used_at IS NULL
       AND pr.expires_at > NOW()`,
    [tokenHash],
  );
  return result.rows[0];
}

async function markResetUsed(resetId) {
  await pool.query(
    `UPDATE password_resets SET used_at = NOW() WHERE reset_id = $1`,
    [resetId],
  );
}

async function updateUserPassword({ userId, passwordHash }) {
  await pool.query(`UPDATE users SET password_hash = $2 WHERE user_id = $1`, [
    userId,
    passwordHash,
  ]);
}

module.exports = {
  findUserByEmail,
  invalidateActiveTokensForUser,
  createResetToken,
  findValidResetByTokenHash,
  markResetUsed,
  updateUserPassword,
};
