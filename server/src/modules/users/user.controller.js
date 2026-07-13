const userService = require("./user.service");

// Deliberately reads userId only from req.user (set by authMiddleware from
// the verified token) — never from a route param. This endpoint always
// returns the caller's own profile; there is no way to request another
// user's data through this route.
async function getMyProfile(req, res, next) {
  try {
    const { userId } = req.user;

    const profile = await userService.getProfile(userId);

    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMyProfile };
