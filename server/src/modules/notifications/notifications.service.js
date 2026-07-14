const notificationsRepository = require("./notifications.repository");
const ApiError = require("../../utils/apiError");

// Same pattern as assertReceiptBelongsToBusiness in receipts.service.js —
// a valid session token for Business A should never be able to touch a
// notification belonging to Business B, even if the notificationId is
// guessed/enumerated correctly.
function assertNotificationBelongsToBusiness(notification, businessId) {
  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }
  if (notification.business_id !== businessId) {
    throw new ApiError(
      403,
      "This notification does not belong to your business",
    );
  }
}

async function listNotificationsForUser({ businessId, userId }) {
  return notificationsRepository.listForUser({ businessId, userId });
}

async function markNotificationAsRead({ notificationId, businessId }) {
  const existing =
    await notificationsRepository.findNotificationById(notificationId);
  assertNotificationBelongsToBusiness(existing, businessId);

  return notificationsRepository.markAsRead(notificationId);
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
  notifyOcrFailed,
  notifyDuplicateFlagged,
  notifyReceiptVerified,
  notifyReceiptRejected,
  notifyJoinRequestCreated,
  notifyJoinRequestResolved,
};
