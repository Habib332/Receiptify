const pool = require("../../config/database");

async function createBusiness({ name, type, address, phone }) {
  const result = await pool.query(
    `INSERT INTO businesses (name, type, address, phone)
     VALUES ($1, $2, $3, $4)
     RETURNING business_id, name, type, address, phone, created_at`,
    [name, type, address, phone],
  );
  return result.rows[0];
}

async function createUser({ businessId, name, email, passwordHash, role }) {
  const result = await pool.query(
    `INSERT INTO users (business_id, name, email, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING user_id, business_id, name, email, role, created_at`,
    [businessId, name, email, passwordHash, role],
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
    `SELECT user_id, business_id, name, email, role, created_at
     FROM users WHERE user_id = $1`,
    [userId],
  );
  return result.rows[0];
}

module.exports = {
  createBusiness,
  createUser,
  findUserByEmail,
  findUserById,
};
