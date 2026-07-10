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

async function linkUserToBusiness({ businessId, userId, role }) {
  const result = await pool.query(
    `INSERT INTO business_users (business_id, user_id, role)
     VALUES ($1, $2, $3)
     RETURNING business_id, user_id, role, joined_at`,
    [businessId, userId, role],
  );
  return result.rows[0];
}

module.exports = { createBusiness, linkUserToBusiness };
