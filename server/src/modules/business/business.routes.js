const express = require("express");
const multer = require("multer");
const router = express.Router();
const businessController = require("./business.controller");
const joinRequestsController = require("./businessJoinRequests.controller");
const authMiddleware = require("../../middleware/auth.middleware");

// In-memory storage: multer just hands us a buffer (req.file.buffer), we
// forward that straight to Supabase — file is never written to disk on
// this server. limits.fileSize is a fast-fail before we even attempt
// upload; supabaseStorage.js re-checks it too (defense in depth).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Order matters: /stats must come before /:id-style routes if any get added
// later, otherwise Express would try to treat "stats" as an :id param.
router.get("/stats", authMiddleware, businessController.getDashboardStats);
router.get("/", authMiddleware, businessController.listBusinesses);
router.post("/", authMiddleware, businessController.createBusiness);

// No allowRoles(...) here on purpose: role must be checked per-business via
// a business_users lookup (done in business.service.js), not read off the
// sessionToken — the token's role reflects whichever business the user
// last selected, which may not be the businessId in this URL.
router.patch("/:businessId", authMiddleware, businessController.updateBusiness);
router.delete(
  "/:businessId",
  authMiddleware,
  businessController.deleteBusiness,
);

// multipart/form-data, field name must be "logo"
router.post(
  "/:businessId/logo",
  authMiddleware,
  upload.single("logo"),
  businessController.uploadLogo,
);

router.get(
  "/:businessId/members",
  authMiddleware,
  businessController.getBusinessMembers,
);
// --- Join-request flow (replaces the old instant-join /:businessId/join) ---
// Requesting to join doesn't require existing membership, so no role check
// here — ownership of the *review* actions is checked per-business inside
// businessJoinRequests.service.js (assertCanReviewRequests), same reasoning
// as PATCH/DELETE above: the sessionToken's role can't be trusted for a
// business other than the one it was issued for.
router.post(
  "/:businessId/join-requests",
  authMiddleware,
  joinRequestsController.createJoinRequest,
);
router.get(
  "/:businessId/join-requests",
  authMiddleware,
  joinRequestsController.listJoinRequests,
);
router.patch(
  "/:businessId/join-requests/:requestId/approve",
  authMiddleware,
  joinRequestsController.approveJoinRequest,
);
router.patch(
  "/:businessId/join-requests/:requestId/reject",
  authMiddleware,
  joinRequestsController.rejectJoinRequest,
);

router.delete(
  "/:businessId/members/:memberId",
  authMiddleware,
  businessController.removeMemberFromBusiness,
);
module.exports = router;
