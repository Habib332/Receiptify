const authService = require("./auth.service");

async function register(req, res, next) {
  try {
    const {
      businessName,
      businessType,
      address,
      phone,
      ownerName,
      email,
      password,
    } = req.body;

    const result = await authService.registerBusinessOwner({
      businessName,
      businessType,
      address,
      phone,
      ownerName,
      email,
      password,
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const result = await authService.login({ email, password });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function selectBusiness(req, res, next) {
  try {
    // req.user comes from an identity-token-only middleware — see note below
    const userId = req.user.userId;
    const { businessId } = req.body;

    const result = await authService.selectBusiness({ userId, businessId });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, selectBusiness };
