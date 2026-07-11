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

// ---- Reads / stats (system-wide, not scoped to a single user) ----

// Full business list for the "Available Businesses" table.
// Includes optional search (by name) and type filter, since the UI has
// both a search box and an "All Types" filter dropdown.
async function getAllBusinesses({ search, type } = {}) {
  const conditions = [];
  const values = [];

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`name ILIKE $${values.length}`);
  }

  if (type) {
    values.push(type);
    conditions.push(`type = $${values.length}`);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const result = await pool.query(
    `SELECT business_id, name, type, address, phone, logo_url, created_at
     FROM businesses
     ${whereClause}
     ORDER BY created_at DESC`,
    values,
  );
  return result.rows;
}

// Total count of businesses in the system.
async function countAllBusinesses() {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count FROM businesses`,
  );
  return result.rows[0].count;
}

// Distinct business types/categories currently in use, e.g.
// ['Grocery', 'Restaurant', 'Pharmacy'] — powers both the "Business Types"
// stat card (count) and could back the "All Types" filter dropdown options.
async function getDistinctBusinessTypes() {
  const result = await pool.query(
    `SELECT DISTINCT type
     FROM businesses
     WHERE type IS NOT NULL AND type <> ''
     ORDER BY type ASC`,
  );
  return result.rows.map((row) => row.type);
}

module.exports = {
  createBusiness,
  linkUserToBusiness,
  getAllBusinesses,
  countAllBusinesses,
  getDistinctBusinessTypes,
};
