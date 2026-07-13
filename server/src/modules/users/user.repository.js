const pool = require("../../config/database");

// Basic profile fields — mirrors the shape authRepository.findUserById
// already returns (no password_hash / google_id).
async function findProfileById(userId) {
  const result = await pool.query(
    `SELECT user_id, name, email, avatar_url, created_at
     FROM users
     WHERE user_id = $1`,
    [userId],
  );
  return result.rows[0];
}

// One query, all roles: joins business_users -> businesses, then
// left-joins a per-business receipt count (COUNT over a LEFT JOIN so
// businesses with zero receipts still come back as 0, not omitted).
// Grouping into owner/manager/staff buckets happens in the service layer
// so this stays a single flat result set the caller can shape however
// it needs.
async function getUserBusinessesWithReceiptCounts(userId) {
  const result = await pool.query(
    `SELECT
        b.business_id,
        b.name,
        b.type,
        b.logo_url,
        bu.role,
        bu.joined_at,
        COUNT(r.receipt_id)::int AS receipts_count
     FROM business_users bu
     JOIN businesses b ON b.business_id = bu.business_id
     LEFT JOIN receipts r ON r.business_id = b.business_id
     WHERE bu.user_id = $1
     GROUP BY b.business_id, b.name, b.type, b.logo_url, bu.role, bu.joined_at
     ORDER BY bu.joined_at ASC`,
    [userId],
  );
  return result.rows;
}

// Total receipts the user has personally uploaded, across every business
// (independent of their role) — this is "receipts submitted", not
// "receipts belonging to businesses they own".
async function getReceiptsSubmittedCount(userId) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM receipts
     WHERE uploaded_by = $1`,
    [userId],
  );
  return result.rows[0].count;
}

// Same as above but broken down per business, for the "hover to see
// business-wise" breakdown on the Receipts Submitted stat card.
async function getReceiptsSubmittedByBusiness(userId) {
  const result = await pool.query(
    `SELECT
        b.business_id,
        b.name,
        COUNT(r.receipt_id)::int AS receipts_count
     FROM receipts r
     JOIN businesses b ON b.business_id = r.business_id
     WHERE r.uploaded_by = $1
     GROUP BY b.business_id, b.name
     ORDER BY receipts_count DESC`,
    [userId],
  );
  return result.rows;
}

module.exports = {
  findProfileById,
  getUserBusinessesWithReceiptCounts,
  getReceiptsSubmittedCount,
  getReceiptsSubmittedByBusiness,
};
