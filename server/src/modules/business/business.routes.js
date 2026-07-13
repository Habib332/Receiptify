const express = require("express");
const multer = require("multer");
const router = express.Router();
const businessController = require("./business.controller");
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

// --- Add to business.routes.js, near the other /:businessId routes ---

router.post("/:businessId/join", authMiddleware, businessController.joinBusiness);

module.exports = router;
