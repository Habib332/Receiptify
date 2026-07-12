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

// PATCH /api/business/:businessId
async function updateBusiness(req, res, next) {
  try {
    const userId = req.user.userId;
    const { businessId } = req.params;
    const { name, type, address, phone, logoUrl } = req.body;

    const business = await businessService.updateBusiness({
      userId,
      businessId,
      updates: { name, type, address, phone, logoUrl },
    });

    res.status(200).json({ success: true, data: business });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/business/:businessId
// Body must include { confirm: true } — see business.service.js for why.
async function deleteBusiness(req, res, next) {
  try {
    const userId = req.user.userId;
    const { businessId } = req.params;
    const { confirm } = req.body;

    const result = await businessService.deleteBusiness({
      userId,
      businessId,
      confirm,
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createBusiness,
  listBusinesses,
  getDashboardStats,
  updateBusiness,
  deleteBusiness,
};
