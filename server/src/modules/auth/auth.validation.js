const Joi = require("joi");

const register = Joi.object({
  name: Joi.string().trim().min(2).max(255).required(),
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().min(8).max(72).required(),
  // 72 is bcrypt's actual max input length — longer input is silently
  // truncated by bcrypt, so capping here surfaces that as a clear error
  // instead of a confusing "your password didn't work" later.
});

const login = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().required(),
});

const selectBusiness = Joi.object({
  businessId: Joi.number().integer().positive().required(),
});

module.exports = { register, login, selectBusiness };
