const Joi = require("joi");

const createBusiness = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  type: Joi.string().trim().max(100).allow("", null),
  address: Joi.string().trim().max(1000).allow("", null),
  phone: Joi.string().trim().max(20).allow("", null),
});

// All fields optional on update — only checks the shape of whatever IS sent.
const updateBusiness = Joi.object({
  name: Joi.string().trim().min(1).max(255),
  type: Joi.string().trim().max(100).allow("", null),
  address: Joi.string().trim().max(1000).allow("", null),
  phone: Joi.string().trim().max(20).allow("", null),
  logoUrl: Joi.string().trim().uri().allow("", null),
}).min(1); // at least one field must be present, or there's nothing to update

const deleteBusiness = Joi.object({
  confirm: Joi.boolean().valid(true).required().messages({
    "any.only": "Deletion requires explicit confirmation (confirm: true)",
  }),
});

module.exports = { createBusiness, updateBusiness, deleteBusiness };
