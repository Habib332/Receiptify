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

// Duplicate rule: same name AND same address (case-insensitive), so the
// same chain name can exist at different locations without being blocked.
async function findDuplicateBusiness({ name, address }) {
  const result = await pool.query(
    `SELECT business_id, name, address
     FROM businesses
     WHERE LOWER(name) = LOWER($1) AND LOWER(COALESCE(address, '')) = LOWER(COALESCE($2, ''))`,
    [name, address],
  );
  return result.rows[0];
}

async function findBusinessById(businessId) {
  const result = await pool.query(
    `SELECT business_id, name, type, address, phone, logo_url, created_at
     FROM businesses WHERE business_id = $1`,
    [businessId],
  );
  return result.rows[0];
}

// Looks up a specific user's role for a specific business — this is the
// check update/delete need, since a user's role can differ per business
// and the sessionToken's role only reflects whichever business they most
// recently selected, not necessarily the one being modified here.
async function getUserRoleForBusiness({ userId, businessId }) {
  const result = await pool.query(
    `SELECT role FROM business_users WHERE user_id = $1 AND business_id = $2`,
    [userId, businessId],
  );
  return result.rows[0];
}

// All businesses this user owns or manages — used by notifications to
// scope "which businesses' notifications can this user see" without
// relying on a single businessId from the session token. A user can
// own/manage multiple businesses; notifications shouldn't be limited to
// whichever one they last selected client-side. Staff-role memberships
// are intentionally excluded here — only owners/managers get business-wide
// reviewer notifications (e.g. new join requests).
async function getOwnedOrManagedBusinessIds(userId) {
  const result = await pool.query(
    `SELECT business_id FROM business_users
     WHERE user_id = $1 AND role IN ('owner', 'manager')`,
    [userId],
  );
  return result.rows.map((row) => row.business_id);
}

async function updateBusiness(
  businessId,
  { name, type, address, phone, logoUrl },
) {
  const result = await pool.query(
    `UPDATE businesses
     SET name = COALESCE($2, name),
         type = COALESCE($3, type),
         address = COALESCE($4, address),
         phone = COALESCE($5, phone),
         logo_url = COALESCE($6, logo_url)
     WHERE business_id = $1
     RETURNING business_id, name, type, address, phone, logo_url, created_at`,
    [businessId, name, type, address, phone, logoUrl],
  );
  return result.rows[0];
}

async function deleteBusiness(businessId) {
  // Cascades to business_users and receipts (ON DELETE CASCADE in schema).
  const result = await pool.query(
    `DELETE FROM businesses WHERE business_id = $1 RETURNING business_id, name`,
    [businessId],
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

// --- Add these to business.model.js ---

// Used by listBusinesses to annotate each row with the current user's role
// (or null if they're not linked to that business yet) so the frontend can
// decide whether to show "Join".
async function getUserRolesForBusinesses({ userId, businessIds }) {
  if (!businessIds.length) return {};
  const result = await pool.query(
    `SELECT business_id, role FROM business_users
     WHERE user_id = $1 AND business_id = ANY($2::int[])`,
    [userId, businessIds],
  );
  const map = {};
  for (const row of result.rows) {
    map[row.business_id] = row.role;
  }
  return map;
}

// Join as staff (default role). Returns the existing link if the user is
// already a member (idempotent) rather than throwing a duplicate-key error,
// since a double-click or stale UI shouldn't surface as a 500.
async function joinBusinessAsStaff({ businessId, userId }) {
  const existing = await getUserRoleForBusiness({ userId, businessId });
  if (existing) return { ...existing, alreadyMember: true };

  const result = await pool.query(
    `INSERT INTO business_users (business_id, user_id, role)
     VALUES ($1, $2, 'staff')
     RETURNING business_id, user_id, role, joined_at`,
    [businessId, userId],
  );
  return { ...result.rows[0], alreadyMember: false };
}

async function findOwnersAndManagers({ businessId }) {
  const result = await pool.query(
    `SELECT user_id, role
     FROM business_users
     WHERE business_id = $1 AND role IN ('owner', 'manager')`,
    [businessId],
  );
  return result.rows;
}

module.exports = {
  createBusiness,
  linkUserToBusiness,
  getAllBusinesses,
  countAllBusinesses,
  getDistinctBusinessTypes,
  findDuplicateBusiness,
  findBusinessById,
  getUserRoleForBusiness,
  getOwnedOrManagedBusinessIds,
  updateBusiness,
  deleteBusiness,
  getUserRolesForBusinesses,
  joinBusinessAsStaff,
  findOwnersAndManagers,
};
