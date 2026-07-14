const notificationsService = require("./notifications.service");

// GET /api/notifications — scoped to the business + user on the sessionToken
async function listNotifications(req, res, next) {
  try {
    const { userId, businessId } = req.user;

    const notifications = await notificationsService.listNotificationsForUser({
      businessId,
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
    const { userId, businessId } = req.user;
    const { notificationId } = req.params;

    const notification = await notificationsService.markNotificationAsRead({
      notificationId,
      businessId,
      userId,
    });

    res.status(200).json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
}

module.exports = { listNotifications, markAsRead };
