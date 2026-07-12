const ApiError = require("../utils/apiError");

/**
 * Returns an Express middleware that validates req.body against the given
 * Joi schema. Rejects with a 400 listing every validation error (not just
 * the first) before the request ever reaches a controller.
 *
 * Usage: router.post("/", validate(schema), controller.fn)
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // collect all errors, not just the first
      stripUnknown: true, // drop fields not defined in the schema
    });

    if (error) {
      const message = error.details.map((detail) => detail.message).join("; ");
      return next(new ApiError(400, message));
    }

    // Replace req.body with the validated (and stripped/coerced) value —
    // e.g. Joi can coerce "3" -> 3 for numeric fields, so downstream code
    // gets clean, correctly-typed data.
    req.body = value;
    next();
  };
}

module.exports = validate;
