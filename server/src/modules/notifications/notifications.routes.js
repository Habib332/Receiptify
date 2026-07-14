const express = require("express");
const router = express.Router();
const notificationsController = require("./notifications.controller");
const authMiddleware = require("../../middleware/auth.middleware");

// Requires a sessionToken (post select-business) — req.user.businessId
// only exists on that token, same as receipts routes. Both routes are
// scoped to "this business, as this user" — no allowRoles() needed since
// any role can have notifications and can only ever see their own plus
// business-wide ones (enforced in notifications.service.js).
router.get("/", authMiddleware, notificationsController.listNotifications);
router.patch(
  "/:notificationId/read",
  authMiddleware,
  notificationsController.markAsRead,
);

module.exports = router;
