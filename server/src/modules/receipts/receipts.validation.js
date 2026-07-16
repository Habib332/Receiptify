const Joi = require("joi");

// receiverName maps to receiver_name in DB.
// receiverName/amount/receiptDate are conditionally required: mandatory
// on manual entry, optional when a screenshot is attached (OCR fills
// them in async — see runOcrForReceipt in receipts.service.js).
const createReceipt = Joi.object({
  receiverName: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .when(Joi.ref("$hasScreenshot"), {
      is: true,
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
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

  senderName: Joi.string().trim().max(255).allow("", null),
  senderBank: Joi.string().trim().max(100).allow("", null),
  receiverBank: Joi.string().trim().max(100).allow("", null),
  transactionReference: Joi.string().trim().max(255).allow("", null),
});

const updateReceipt = Joi.object({
  receiverName: Joi.string().trim().min(1).max(255),
  amount: Joi.number().positive().precision(2),
  currency: Joi.string().trim().uppercase().length(3),
  receiptDate: Joi.date().iso().max("now").messages({
    "date.max": "receiptDate cannot be in the future",
  }),
  notes: Joi.string().trim().max(2000).allow("", null),

  senderName: Joi.string().trim().max(255).allow("", null),
  senderBank: Joi.string().trim().max(100).allow("", null),
  receiverBank: Joi.string().trim().max(100).allow("", null),
  transactionReference: Joi.string().trim().max(255).allow("", null),
}).min(1);

const setVerificationStatus = Joi.object({
  status: Joi.string().trim().valid("verified", "rejected").required(),
});

const resolveDuplicateFlag = Joi.object({
  isDuplicate: Joi.boolean().required(),
});

module.exports = {
  createReceipt,
  updateReceipt,
  setVerificationStatus,
  resolveDuplicateFlag,
};