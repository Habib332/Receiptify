const notificationsRepository = require("./notifications.repository");
// Adjust this path if business.repository.js lives elsewhere relative to
// this file — matches how businessJoinRequests.service.js imports it.
const businessRepository = require("../business/business.repository");
const ApiError = require("../../utils/apiError");

// Same pattern as assertReceiptBelongsToBusiness in receipts.service.js —
// a user should never be able to touch a notification belonging to a
// business they don't own/manage, even if the notificationId is
// guessed/enumerated correctly.
//
// "Belongs to this user" is now checked against the full set of
// businesses the user owns/manages (looked up fresh from the DB via
// business.repository.getOwnedOrManagedBusinessIds), rather than a
// single businessId pulled from a session token — a user can own/manage
// more than one business, and this must not depend on whichever one they
// last "selected" client-side.
function assertNotificationVisibleToUser(
  notification,
  ownedOrManagedBusinessIds,
) {
  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }
  if (!ownedOrManagedBusinessIds.includes(notification.business_id)) {
    throw new ApiError(
      403,
      "This notification does not belong to a business you own or manage",
    );
  }
}

// Only the reviewer-facing "New join request" notification should ever
// render approve/reject controls — never the applicant-facing
// "approved"/"declined" one. Both share type "join_request" and both
// join in the same requested_role/status columns via
// related_join_request_id, so title is what distinguishes them (title is
// set once at creation and never changes, unlike jr.status which is live
// and would otherwise make an old "declined" notification look
// re-openable if the same requester ever submitted a new request that
// happened to resolve to 'pending' with the same request_id — it can't
// in practice since request ids don't get reused, but keying off title
// rather than status keeps the two notification "kinds" unambiguous even
// if that assumption ever changes).
const REVIEWER_JOIN_REQUEST_TITLE = "New join request";

function shapeNotification(row) {
  const isReviewerJoinRequest =
    row.type === "join_request" && row.title === REVIEWER_JOIN_REQUEST_TITLE;

  return {
    id: row.notification_id,
    type: row.type,
    title: row.title,
    message: row.message,
    businessId: row.business_id,
    businessName: row.business_name ?? null,
    actorName: row.actor_name ?? null,
    actorEmail: row.actor_email ?? null,
    actorAvatarUrl: row.actor_avatar_url ?? null,
    createdAt: row.created_at,
    read: row.is_read,
    joinRequest:
      isReviewerJoinRequest && row.related_join_request_id
        ? {
            requestId: row.related_join_request_id,
            requestedRole: row.join_request_requested_role,
            status: row.join_request_status,
          }
        : null,
  };
}

// Lists notifications across every business this user owns or manages —
// scope is resolved fresh from business_users on each call, not from a
// single businessId on the session token. A user with no owned/managed
// businesses simply gets an empty list (staff-only members don't see
// business-wide reviewer notifications, by design).
async function listNotificationsForUser({ userId }) {
  const businessIds =
    await businessRepository.getOwnedOrManagedBusinessIds(userId);
  const rows = await notificationsRepository.listForUser({
    businessIds,
    userId,
  });
  return rows.map(shapeNotification);
}

async function markNotificationAsRead({ notificationId, userId }) {
  const businessIds =
    await businessRepository.getOwnedOrManagedBusinessIds(userId);

  const existing =
    await notificationsRepository.findNotificationById(notificationId);
  assertNotificationVisibleToUser(existing, businessIds);

  return notificationsRepository.markAsRead(notificationId);
}

// Marks every notification visible to this user (across all
// owned/managed businesses) as read. Backs PATCH /notifications/read-all,
// which the frontend already calls but which had no route/service/
// repository implementation before this.
async function markAllNotificationsAsRead({ userId }) {
  const businessIds =
    await businessRepository.getOwnedOrManagedBusinessIds(userId);
  const rows = await notificationsRepository.markAllAsRead({
    businessIds,
    userId,
  });
  return rows.map(shapeNotification);
}

// ---------------------------------------------------------------------
// Trigger-point helpers. Each wraps createNotification for one specific
// event so call sites (receipts.service.js, the future join-requests
// service, etc.) don't need to know column names or construct the
// title/message text themselves — mirrors how ocr.js keeps its parsing
// concerns separate from receipts.service.js's business logic.
//
// All of these are fire-and-forget from the caller's perspective (same
// spirit as runOcrForReceipt not being awaited in createReceipt) but the
// functions themselves are async/awaitable — it's the caller's choice
// whether to await or let it run in the background. None of these throw
// on failure to notify; a failed notification insert should never break
// the underlying operation (an OCR failure notification failing to send
// shouldn't mask the OCR failure itself).
// ---------------------------------------------------------------------

async function safeCreate(params) {
  try {
    return await notificationsRepository.createNotification(params);
  } catch (err) {
    // Deliberately swallowed — see comment above. Logged so it's not
    // silently invisible during development.
    console.error("Failed to create notification:", err.message);
    return null;
  }
}

// business-wide (userId omitted) — everyone with access to the business
// should see that a receipt's OCR failed, not just whoever uploaded it.
async function notifyOcrFailed({ businessId, receiptId, vendorName }) {
  return safeCreate({
    businessId,
    userId: null,
    type: "ocr_failed",
    title: "OCR processing failed",
    message: vendorName
      ? `OCR failed to process the receipt from ${vendorName}. Please enter the details manually.`
      : "OCR failed to process a receipt. Please enter the details manually.",
    relatedReceiptId: receiptId,
  });
}

async function notifyDuplicateFlagged({ businessId, receiptId, vendorName }) {
  return safeCreate({
    businessId,
    userId: null,
    type: "duplicate_flagged",
    title: "Possible duplicate receipt",
    message: vendorName
      ? `A receipt from ${vendorName} was flagged as a possible duplicate. Please review it.`
      : "A receipt was flagged as a possible duplicate. Please review it.",
    relatedReceiptId: receiptId,
  });
}

// Verification notifications are aimed at the uploader specifically
// (userId set), since "your receipt was verified/rejected" is personal,
// not business-wide.
async function notifyReceiptVerified({
  businessId,
  userId,
  receiptId,
  vendorName,
}) {
  return safeCreate({
    businessId,
    userId,
    type: "receipt_verified",
    title: "Receipt verified",
    message: vendorName
      ? `Your receipt from ${vendorName} was verified.`
      : "Your receipt was verified.",
    relatedReceiptId: receiptId,
  });
}

async function notifyReceiptRejected({
  businessId,
  userId,
  receiptId,
  vendorName,
}) {
  return safeCreate({
    businessId,
    userId,
    type: "receipt_rejected",
    title: "Receipt rejected",
    message: vendorName
      ? `Your receipt from ${vendorName} was rejected. Please review and re-upload if needed.`
      : "Your receipt was rejected. Please review and re-upload if needed.",
    relatedReceiptId: receiptId,
  });
}

// Fans out to every owner of the business — ownerUserIds comes from
// businessJoinRequestsRepository.getOwnersForBusiness(businessId), kept
// out of this file to avoid a circular dependency between the two
// modules; the caller (join-requests service) already has that list.
async function notifyJoinRequestCreated({
  businessId,
  ownerUserIds,
  joinRequestId,
  applicantName,
}) {
  return Promise.all(
    ownerUserIds.map((ownerUserId) =>
      safeCreate({
        businessId,
        userId: ownerUserId,
        type: "join_request",
        title: "New join request",
        message: applicantName
          ? `${applicantName} requested to join your business.`
          : "Someone requested to join your business.",
        relatedJoinRequestId: joinRequestId,
      }),
    ),
  );
}

// Aimed at the applicant — lets them know the outcome of their request.
async function notifyJoinRequestResolved({
  businessId,
  userId,
  joinRequestId,
  status,
}) {
  const approved = status === "approved";
  return safeCreate({
    businessId,
    userId,
    type: "join_request",
    title: approved ? "Join request approved" : "Join request declined",
    message: approved
      ? "Your request to join the business was approved."
      : "Your request to join the business was declined.",
    relatedJoinRequestId: joinRequestId,
  });
}

module.exports = {
  listNotificationsForUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  notifyOcrFailed,
  notifyDuplicateFlagged,
  notifyReceiptVerified,
  notifyReceiptRejected,
  notifyJoinRequestCreated,
  notifyJoinRequestResolved,
};