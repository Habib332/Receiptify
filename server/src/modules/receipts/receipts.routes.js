const express = require("express");
const multer = require("multer");
const router = express.Router();
const receiptsController = require("./receipts.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const allowRoles = require("../../middleware/rbac.middleware");
const validate = require("../../middleware/validate.middleware");
const {
  createReceipt,
  updateReceipt,
  setVerificationStatus,
  resolveDuplicateFlag,
} = require("./receipts.validation");

// In-memory storage, same pattern as business logos: multer just hands us
// a buffer (req.file.buffer), which receipts.service.js hashes and
// receiptsStorage.js uploads to the PRIVATE receipt-screenshots bucket.
// File never touches this server's disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// All receipts routes require a sessionToken (post select-business) —
// req.user.businessId and req.user.role only exist on that token, not the
// identityToken issued right after login/register/Google sign-in.

// Read: any role (owner, manager, staff) can view
router.get("/", authMiddleware, receiptsController.listReceipts);
router.get("/stats", authMiddleware, receiptsController.getBusinessStats);
router.get("/:receiptId", authMiddleware, receiptsController.getReceipt);
// Returns a fresh short-lived signed URL for this receipt's screenshot —
// call this whenever the frontend actually needs to display the image,
// never cache/store the result.
router.get(
  "/:receiptId/image-url",
  authMiddleware,
  receiptsController.getReceiptImageUrl,
);

// Write: owner/manager only — staff is view-only per project decision.
// multipart/form-data, field name must be "screenshot" — optional; a
// receipt can still be created with no image attached (e.g. manual entry).
router.post(
  "/",
  authMiddleware,
  allowRoles("owner", "manager", "staff"),
  upload.single("screenshot"),
  validate(createReceipt),
  receiptsController.createReceipt,
);
router.patch(
  "/:receiptId",
  authMiddleware,
  allowRoles("owner", "manager","staff"),
  validate(updateReceipt),
  receiptsController.updateReceipt,
);
router.delete(
  "/:receiptId",
  authMiddleware,
  allowRoles("owner", "manager"),
  receiptsController.deleteReceipt,
);

// Verification workflow (PRD 5.5) — owner/manager marks a receipt as
// verified or rejected. Kept as its own route + schema rather than folded
// into the general PATCH, so this specific decision is explicit in the API.
router.patch(
  "/:receiptId/verify",
  authMiddleware,
  allowRoles("owner", "manager"),
  validate(setVerificationStatus),
  receiptsController.setVerificationStatus,
);

// Duplicate resolution (PRD 5.6) — owner/manager confirms or dismisses a
// 'flagged' receipt. Separate from the general PATCH for the same reason.
router.patch(
  "/:receiptId/resolve-duplicate",
  authMiddleware,
  allowRoles("owner", "manager"),
  validate(resolveDuplicateFlag),
  receiptsController.resolveDuplicateFlag,
);

// Bulk upload – owner/manager only
router.post(
  "/bulk",
  authMiddleware,
  allowRoles("owner", "manager"),
  upload.array("screenshots", 50), // max 50 files per request
  receiptsController.createBulkReceipts,
);

module.exports = router;
