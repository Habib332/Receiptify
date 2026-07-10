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

async function createUser({ name, email, passwordHash }) {
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
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

async function linkUserToBusiness({ businessId, userId, role }) {
  const result = await pool.query(
    `INSERT INTO business_users (business_id, user_id, role)
     VALUES ($1, $2, $3)
     RETURNING business_id, user_id, role, joined_at`,
    [businessId, userId, role],
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
  return result.rows[0]; // undefined if user doesn't belong to that business
}

module.exports = {
  createBusiness,
  createUser,
  findUserByEmail,
  findUserById,
  linkUserToBusiness,
  getUserBusinesses,
  getUserRoleForBusiness,
};
