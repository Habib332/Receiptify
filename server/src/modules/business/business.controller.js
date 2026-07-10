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

module.exports = { createBusiness };
