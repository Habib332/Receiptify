const joinRequestsService = require("./businessJoinRequests.service");

// POST /api/business/:businessId/join-requests
// Body: { requestedRole: 'manager' | 'staff' }
// Requires identity token (user isn't scoped to a business yet — that's
// the point of requesting to join one). Same token shape auth.middleware
// already handles for register's follow-up calls.
async function createJoinRequest(req, res, next) {
  try {
    const { userId } = req.user;
    const { businessId } = req.params;
    const { requestedRole } = req.body;

    const request = await joinRequestsService.requestToJoin({
      userId,
      businessId: Number(businessId),
      requestedRole,
    });

    res.status(201).json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
}

// GET /api/business/:businessId/join-requests — owner/manager only
async function listJoinRequests(req, res, next) {
  try {
    const { userId } = req.user;
    const { businessId } = req.params;

    const requests = await joinRequestsService.listPendingRequests({
      userId,
      businessId: Number(businessId),
    });

    res.status(200).json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/business/:businessId/join-requests/:requestId/approve
async function approveJoinRequest(req, res, next) {
  try {
    const { userId } = req.user;
    const { businessId, requestId } = req.params;

    const result = await joinRequestsService.approveRequest({
      requestId: Number(requestId),
      businessId: Number(businessId),
      resolvedBy: userId,
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/business/:businessId/join-requests/:requestId/reject
async function rejectJoinRequest(req, res, next) {
  try {
    const { userId } = req.user;
    const { businessId, requestId } = req.params;

    const result = await joinRequestsService.rejectRequest({
      requestId: Number(requestId),
      businessId: Number(businessId),
      resolvedBy: userId,
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}



module.exports = {
  createJoinRequest,
  listJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
};
