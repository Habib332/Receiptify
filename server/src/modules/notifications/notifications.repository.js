const pool = require("../../config/database");

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

// Notifications visible to this user across every business they own or
// manage: either aimed directly at them (user_id = userId) or
// business-wide (user_id IS NULL) within one of those businesses.
//
// businessIds is looked up fresh per-request in the service layer (via
// business.repository.getOwnedOrManagedBusinessIds) rather than pulled
// from a single-business session token — a user can own/manage more than
// one business, and notifications shouldn't be scoped to whichever one
// they last selected.
//
// LEFT JOINs (not INNER) against business_join_requests and businesses:
// most notifications have no related_join_request_id at all, and this
// query must still return those rows — the join only adds columns when
// related_join_request_id is set, and is NULL-safe otherwise. We select
// jr.status directly (not resolved by the join_requests service) so a
// notification's "actionable" state always reflects the request's
// *current* status, even if it was resolved through some other path
// after the notification row was created.
//
// ru.avatar_url is selected alongside actor_name/actor_email — same
// LEFT JOIN, same NULL-safety: rows with no related_join_request_id (and
// thus no ru match) simply get actor_avatar_url = NULL, which the
// frontend already falls back on to render initials.
async function listForUser({ businessIds, userId }) {
  if (!businessIds || businessIds.length === 0) return [];

  const result = await pool.query(
    `SELECT n.*,
            b.name AS business_name,
            jr.requested_role AS join_request_requested_role,
            jr.status AS join_request_status,
            ru.name AS actor_name,
            ru.email AS actor_email,
            ru.avatar_url AS actor_avatar_url
     FROM notifications n
     LEFT JOIN business_join_requests jr ON jr.request_id = n.related_join_request_id
     LEFT JOIN businesses b ON b.business_id = n.business_id
     LEFT JOIN users ru ON ru.user_id = jr.user_id
     WHERE n.business_id = ANY($1::int[]) AND (n.user_id = $2 OR n.user_id IS NULL)
     ORDER BY n.created_at DESC`,
    [businessIds, userId],
  );
  return result.rows;
}

async function findNotificationById(notificationId) {
  const result = await pool.query(
    `SELECT * FROM notifications WHERE notification_id = $1`,
    [notificationId],
  );
  return result.rows[0];
}

// Marks read. Does not filter by user_id in the WHERE clause — the
// business-wide (user_id IS NULL) case means any member of the business
// can mark it read for themselves conceptually, but since there's no
// per-user read-state table yet, marking read here marks it read for
// everyone who can see it. Acceptable for now (matches "in-app only,
// simple" scope of this module); revisit with a join table if per-user
// read state is ever needed.
async function markAsRead(notificationId) {
  const result = await pool.query(
    `UPDATE notifications SET is_read = TRUE
     WHERE notification_id = $1
     RETURNING *`,
    [notificationId],
  );
  return result.rows[0];
}

// Marks every notification visible to this user (across all businesses
// they own or manage) as read in one statement — backs the frontend's
// "Mark all read" button (PATCH /notifications/read-all), which had no
// matching route/repository function before this.
async function markAllAsRead({ businessIds, userId }) {
  if (!businessIds || businessIds.length === 0) return [];

  const result = await pool.query(
    `UPDATE notifications
     SET is_read = TRUE
     WHERE business_id = ANY($1::int[]) AND (user_id = $2 OR user_id IS NULL)
     RETURNING *`,
    [businessIds, userId],
  );
  return result.rows;
}

module.exports = {
  createNotification,
  listForUser,
  findNotificationById,
  markAsRead,
  markAllAsRead,
};