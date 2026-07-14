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
      // Exposes request state that isn't a body field to schemas via
      // Joi.ref("$hasScreenshot") — e.g. createReceipt uses this to make
      // amount/receiptDate optional when a file was attached (req.file is
      // set by multer earlier in the route chain, before this runs).
      context: {
        hasScreenshot: Boolean(req.file),
      },
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