const express = require("express");
const router = express.Router();
const receiptsController = require("./receipts.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const allowRoles = require("../../middleware/rbac.middleware");

// All receipts routes require a sessionToken (post select-business) —
// req.user.businessId and req.user.role only exist on that token, not the
// identityToken issued right after login/register/Google sign-in.

// Read: any role (owner, manager, staff) can view
router.get("/", authMiddleware, receiptsController.listReceipts);
router.get("/stats", authMiddleware, receiptsController.getBusinessStats);
router.get("/:receiptId", authMiddleware, receiptsController.getReceipt);

// Write: owner/manager only — staff is view-only per project decision
router.post(
  "/",
  authMiddleware,
  allowRoles("owner", "manager"),
  receiptsController.createReceipt,
);
router.patch(
  "/:receiptId",
  authMiddleware,
  allowRoles("owner", "manager"),
  receiptsController.updateReceipt,
);
router.delete(
  "/:receiptId",
  authMiddleware,
  allowRoles("owner", "manager"),
  receiptsController.deleteReceipt,
);

module.exports = router;
