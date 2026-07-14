const joinRequestsRepository = require("./businessJoinRequests.repository");
const businessRepository = require("./business.repository");
const authRepository = require("../auth/auth.repository");
const notificationsService = require("../notifications/notifications.service");
const ApiError = require("../../utils/apiError");

// Same ownership-guard shape as business.service.js's assertCanModifyBusiness,
// duplicated locally rather than imported to avoid a circular require
// (business.service.js will need to stop owning /join once this replaces
// it, and pulling from here back into there gets tangled — keeping this
// module's guard self-contained is simpler).
async function assertCanReviewRequests({ userId, businessId }) {
  const membership = await businessRepository.getUserRoleForBusiness({
    userId,
    businessId,
  });

  if (!membership) {
    throw new ApiError(403, "You do not belong to this business");
  }
  if (!["owner", "manager"].includes(membership.role)) {
    throw new ApiError(403, "Only owner or manager can review join requests");
  }
  return membership;
}

async function requestToJoin({ userId, businessId, requestedRole }) {
  if (!["manager", "staff"].includes(requestedRole)) {
    throw new ApiError(400, "requestedRole must be 'manager' or 'staff'");
  }

  const business = await businessRepository.findBusinessById(businessId);
  if (!business) {
    throw new ApiError(404, "Business not found");
  }

  const alreadyMember = await businessRepository.getUserRoleForBusiness({
    userId,
    businessId,
  });
  if (alreadyMember) {
    throw new ApiError(400, "You are already a member of this business");
  }

  const existingPending = await joinRequestsRepository.findPendingRequest({
    businessId,
    userId,
  });
  if (existingPending) {
    throw new ApiError(
      409,
      "You already have a pending request for this business",
    );
  }

  const request = await joinRequestsRepository.createJoinRequest({
    businessId,
    userId,
    requestedRole,
  });

  // Fire-and-forget, same spirit as OCR's background run — the request
  // is already created and returned to the client; a notification
  // failure shouldn't turn a successful request into an error response.
  const ownerUserIds =
    await joinRequestsRepository.getOwnersForBusiness(businessId);
  const applicant = await authRepository.findUserById(userId);
  notificationsService.notifyJoinRequestCreated({
    businessId,
    ownerUserIds,
    joinRequestId: request.request_id,
    applicantName: applicant?.name,
  });

  return request;
}

async function listPendingRequests({ userId, businessId }) {
  await assertCanReviewRequests({ userId, businessId });
  return joinRequestsRepository.getPendingRequestsForBusiness(businessId);
}

async function approveRequest({ requestId, businessId, resolvedBy }) {
  await assertCanReviewRequests({ userId: resolvedBy, businessId });

  const request = await joinRequestsRepository.findJoinRequestById(requestId);
  if (!request || request.business_id !== businessId) {
    throw new ApiError(404, "Join request not found");
  }
  if (request.status !== "pending") {
    throw new ApiError(400, `This request was already ${request.status}`);
  }

  const resolved = await joinRequestsRepository.approveAndLinkUser({
    requestId,
    businessId,
    userId: request.user_id,
    role: request.requested_role,
    resolvedBy,
  });

  if (!resolved) {
    // Lost a race with another reviewer between the check above and now.
    throw new ApiError(409, "This request was just resolved by someone else");
  }

  notificationsService.notifyJoinRequestResolved({
    businessId,
    userId: request.user_id,
    joinRequestId: requestId,
    status: "approved",
  });

  return resolved;
}

async function rejectRequest({ requestId, businessId, resolvedBy }) {
  await assertCanReviewRequests({ userId: resolvedBy, businessId });

  const request = await joinRequestsRepository.findJoinRequestById(requestId);
  if (!request || request.business_id !== businessId) {
    throw new ApiError(404, "Join request not found");
  }
  if (request.status !== "pending") {
    throw new ApiError(400, `This request was already ${request.status}`);
  }

  const resolved = await joinRequestsRepository.resolveJoinRequest(requestId, {
    status: "rejected",
    resolvedBy,
  });

  notificationsService.notifyJoinRequestResolved({
    businessId,
    userId: request.user_id,
    joinRequestId: requestId,
    status: "rejected",
  });

  return resolved;
}

module.exports = {
  requestToJoin,
  listPendingRequests,
  approveRequest,
  rejectRequest,
};
