const pool = require("../../config/database");

// A user requests to join a business with a specific role. The UNIQUE
// constraint (business_id, user_id, status) in the schema prevents a
// second PENDING request for the same business+user from being created —
// Postgres itself enforces this, not application code — but a resolved
// (approved/rejected) request doesn't block a fresh request afterward.
async function createJoinRequest({ businessId, userId, requestedRole }) {
  const result = await pool.query(
    `INSERT INTO business_join_requests (business_id, user_id, requested_role)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [businessId, userId, requestedRole],
  );
  return result.rows[0];
}

async function findJoinRequestById(requestId) {
  const result = await pool.query(
    `SELECT * FROM business_join_requests WHERE request_id = $1`,
    [requestId],
  );
  return result.rows[0];
}

// Already-pending request for this exact business+user, if any — used to
// give a clear "you already have a pending request" error instead of
// relying solely on the DB's UNIQUE constraint throwing an opaque one.
async function findPendingRequest({ businessId, userId }) {
  const result = await pool.query(
    `SELECT * FROM business_join_requests
     WHERE business_id = $1 AND user_id = $2 AND status = 'pending'`,
    [businessId, userId],
  );
  return result.rows[0];
}

// All pending requests for a business — what an owner/manager reviews.
async function getPendingRequestsForBusiness(businessId) {
  const result = await pool.query(
    `SELECT jr.request_id, jr.business_id, jr.user_id, jr.requested_role,
            jr.status, jr.created_at,
            u.name AS user_name, u.email AS user_email
     FROM business_join_requests jr
     JOIN users u ON u.user_id = jr.user_id
     WHERE jr.business_id = $1 AND jr.status = 'pending'
     ORDER BY jr.created_at ASC`,
    [businessId],
  );
  return result.rows;
}

// Marks a request resolved (approved/rejected) — does NOT touch
// business_users; that's a separate, deliberate step in the service layer
// so "resolve the request" and "actually grant access" stay distinct
// operations, run together in one transaction.
async function resolveJoinRequest(requestId, { status, resolvedBy }) {
  const result = await pool.query(
    `UPDATE business_join_requests
     SET status = $2, resolved_at = NOW(), resolved_by = $3
     WHERE request_id = $1
     RETURNING *`,
    [requestId, status, resolvedBy],
  );
  return result.rows[0];
}

// Owner/manager who should be notified of a new join request for this
// business — used to fan out the notification insert.
async function getOwnersForBusiness(businessId) {
  const result = await pool.query(
    `SELECT user_id FROM business_users WHERE business_id = $1 AND role = 'owner'`,
    [businessId],
  );
  return result.rows.map((row) => row.user_id);
}

module.exports = {
  createJoinRequest,
  findJoinRequestById,
  findPendingRequest,
  getPendingRequestsForBusiness,
  resolveJoinRequest,
  getOwnersForBusiness,
};
