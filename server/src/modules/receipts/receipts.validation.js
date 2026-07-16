const Joi = require("joi");

// amount/receiptDate are conditionally required: mandatory on manual entry,
// optional when a screenshot is attached (OCR fills them in async — see
// runOcrForReceipt in receipts.service.js). The branch is driven by Joi
// context ($hasScreenshot), which validate.middleware.js sets based on
// whether multer populated req.file — NOT a field in req.body itself.
const createReceipt = Joi.object({
  vendorName: Joi.string().trim().min(1).max(255).required(),
  amount: Joi.number().positive().precision(2).when(Joi.ref("$hasScreenshot"), {
    is: true,
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  currency: Joi.string().trim().uppercase().length(3).default("PKR"),
  receiptDate: Joi.date()
    .iso()
    .max("now")
    .when(Joi.ref("$hasScreenshot"), {
      is: true,
      then: Joi.optional(),
      otherwise: Joi.required(),
    })
    .messages({
      "date.max": "receiptDate cannot be in the future",
    }),
  notes: Joi.string().trim().max(2000).allow("", null),
  // NOTE: no imageUrl field here — the screenshot is uploaded as a
  // multipart file (field name "screenshot", see receipts.routes.js),
  // never passed as a URL/path string in the JSON body. This schema
  // validates req.body; the file itself is validated separately by
  // multer's limits + receiptsStorage.js's MIME/size checks.

  // Payment-verification fields — customerName/customerPhone removed
  // (column dropped from schema); bankName split into senderBank/
  // receiverBank, receiverName added — matches the current receipts
  // table and ocr.js's extractReceiptFields output. All optional since
  // OCR can fill them in async when a screenshot is attached.
  senderName: Joi.string().trim().max(255).allow("", null),
  senderBank: Joi.string().trim().max(100).allow("", null),
  receiverName: Joi.string().trim().max(255).allow("", null),
  receiverBank: Joi.string().trim().max(100).allow("", null),
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

  senderName: Joi.string().trim().max(255).allow("", null),
  senderBank: Joi.string().trim().max(100).allow("", null),
  receiverName: Joi.string().trim().max(255).allow("", null),
  receiverBank: Joi.string().trim().max(100).allow("", null),
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
