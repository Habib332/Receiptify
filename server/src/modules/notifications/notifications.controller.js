const notificationsService = require("./notifications.service");

// GET /api/notifications — scoped to every business this user owns or
// manages, resolved fresh from the DB in the service layer. No longer
// depends on a businessId from the session token: an identity-only token
// (just userId) is sufficient, and a user with multiple businesses sees
// notifications from all of them, not just whichever one was last
// selected client-side.
async function listNotifications(req, res, next) {
  try {
    const { userId } = req.user;

    const notifications = await notificationsService.listNotificationsForUser({
      userId,
    });

    res.status(200).json({ success: true, data: notifications });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/notifications/:notificationId/read
async function markAsRead(req, res, next) {
  try {
    const { userId } = req.user;
    const { notificationId } = req.params;

    const notification = await notificationsService.markNotificationAsRead({
      notificationId,
      userId,
    });

    res.status(200).json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/notifications/read-all — previously called by the frontend
// with no matching route/controller/service implementation.
async function markAllAsRead(req, res, next) {
  try {
    const { userId } = req.user;

    const notifications = await notificationsService.markAllNotificationsAsRead(
      {
        userId,
      },
    );

    res.status(200).json({ success: true, data: notifications });
  } catch (err) {
    next(err);
  }
}

module.exports = { listNotifications, markAsRead, markAllAsRead };
