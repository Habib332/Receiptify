const Joi = require("joi");

const createReceipt = Joi.object({
  vendorName: Joi.string().trim().min(1).max(255).required(),
  amount: Joi.number().positive().precision(2).required(),
  currency: Joi.string().trim().uppercase().length(3).default("PKR"),
  receiptDate: Joi.date().iso().max("now").required().messages({
    "date.max": "receiptDate cannot be in the future",
  }),
  notes: Joi.string().trim().max(2000).allow("", null),
  // NOTE: no imageUrl field here — the screenshot is uploaded as a
  // multipart file (field name "screenshot", see receipts.routes.js),
  // never passed as a URL/path string in the JSON body. This schema
  // validates req.body; the file itself is validated separately by
  // multer's limits + receiptsStorage.js's MIME/size checks.

  // Payment-verification fields — all optional for now since none of them
  // are populated by OCR yet; manual entry until that's built.
  customerName: Joi.string().trim().max(255).allow("", null),
  customerPhone: Joi.string().trim().max(20).allow("", null),
  senderName: Joi.string().trim().max(255).allow("", null),
  bankName: Joi.string().trim().max(100).allow("", null),
  transactionReference: Joi.string().trim().max(255).allow("", null),
});

// All fields optional on update — only checks the shape of whatever IS sent.
// Also excludes imageUrl for the same reason as above — updating the
// screenshot itself isn't supported through this endpoint yet (would need
// its own multipart route + old-file cleanup, not a plain PATCH).
const updateReceipt = Joi.object({
  vendorName: Joi.string().trim().min(1).max(255),
  amount: Joi.number().positive().precision(2),
  currency: Joi.string().trim().uppercase().length(3),
  receiptDate: Joi.date().iso().max("now").messages({
    "date.max": "receiptDate cannot be in the future",
  }),
  notes: Joi.string().trim().max(2000).allow("", null),

  customerName: Joi.string().trim().max(255).allow("", null),
  customerPhone: Joi.string().trim().max(20).allow("", null),
  senderName: Joi.string().trim().max(255).allow("", null),
  bankName: Joi.string().trim().max(100).allow("", null),
  transactionReference: Joi.string().trim().max(255).allow("", null),
}).min(1);

// PATCH /api/receipts/:receiptId/verify — owner/manager marks a receipt
// verified or rejected (PRD 5.5). Kept as its own schema since it's a
// distinct, narrower action from a general field update.
const setVerificationStatus = Joi.object({
  status: Joi.string().trim().valid("verified", "rejected").required(),
});

// PATCH /api/receipts/:receiptId/resolve-duplicate — owner/manager
// resolves a 'flagged' receipt one way or the other (PRD 5.6).
const resolveDuplicateFlag = Joi.object({
  isDuplicate: Joi.boolean().required(),
});

module.exports = {
  createReceipt,
  updateReceipt,
  setVerificationStatus,
  resolveDuplicateFlag,
};
