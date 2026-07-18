const express = require("express");
const router = express.Router();
const notificationsController = require("./notifications.controller");
const authMiddleware = require("../../middleware/auth.middleware");

// Only requires a valid identity token (userId) — no business selection
// step needed. Scope (which businesses' notifications a user can see or
// mark read) is resolved server-side per-request from business_users,
// not from anything on the token. Any role can have notifications and
// can only ever see their own plus business-wide ones for businesses
// they own/manage (enforced in notifications.service.js).
router.get("/", authMiddleware, notificationsController.listNotifications);
router.patch(
  "/:notificationId/read",
  authMiddleware,
  notificationsController.markAsRead,
);
router.patch(
  "/read-all",
  authMiddleware,
  notificationsController.markAllAsRead,
);

module.exports = router;
