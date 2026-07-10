const authService = require("./auth.service");

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const result = await authService.register({ name, email, password });

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
    const userId = req.user.userId;
    const { businessId } = req.body;

    const result = await authService.selectBusiness({ userId, businessId });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, selectBusiness };
