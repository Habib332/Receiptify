const pool = require("../../config/database");

// Minimal repository for now — just what the join-request flow needs
// (creating a notification). GET /list and PATCH /read endpoints are a
// separate, not-yet-built task per the project's own next-steps list;
// this file is meant to grow into that module, not be duplicated later.
async function createNotification({
  businessId,
  userId, // nullable — null means visible to all business members
  type,
  title,
  message,
  relatedReceiptId,
  relatedJoinRequestId,
}) {
  const result = await pool.query(
    `INSERT INTO notifications
       (business_id, user_id, type, title, message, related_receipt_id, related_join_request_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      businessId,
      userId,
      type,
      title,
      message,
      relatedReceiptId || null,
      relatedJoinRequestId || null,
    ],
  );
  return result.rows[0];
}

module.exports = { createNotification };
