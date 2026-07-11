const businessService = require("./business.service");

async function createBusiness(req, res, next) {
  try {
    const userId = req.user.userId; // from identity token via auth.middleware
    const { name, type, address, phone } = req.body;

    const business = await businessService.createBusiness({
      userId,
      name,
      type,
      address,
      phone,
    });

    res.status(201).json({ success: true, data: business });
  } catch (err) {
    next(err);
  }
}

// GET /api/business?search=&type=
async function listBusinesses(req, res, next) {
  try {
    const { search, type } = req.query;

    const businesses = await businessService.listBusinesses({ search, type });

    res.status(200).json({ success: true, data: businesses });
  } catch (err) {
    next(err);
  }
}

// GET /api/business/stats
async function getDashboardStats(req, res, next) {
  try {
    const stats = await businessService.getDashboardStats();

    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}

module.exports = { createBusiness, listBusinesses, getDashboardStats };
