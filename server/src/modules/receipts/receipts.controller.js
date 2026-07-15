const receiptsService = require("./receipts.service");

// POST /api/receipts
async function createReceipt(req, res, next) {
  try {
    const { userId, businessId } = req.user; // from sessionToken via auth.middleware
    const {
      vendorName,
      amount,
      currency,
      receiptDate,
      notes,
      customerName,
      customerPhone,
      senderName,
      bankName,
      transactionReference,
    } = req.body;

    // req.file only exists if a "screenshot" field was actually attached
    // (multer, memoryStorage — see receipts.routes.js) — a receipt can
    // still be created with no image at all, so all of this is optional.
    const fileBuffer = req.file ? req.file.buffer : undefined;
    const originalName = req.file ? req.file.originalname : undefined;
    const mimeType = req.file ? req.file.mimetype : undefined;

    const receipt = await receiptsService.createReceipt({
      businessId,
      uploadedBy: userId,
      vendorName,
      amount,
      currency,
      receiptDate,
      notes,
      fileBuffer,
      originalName,
      mimeType,
      customerName,
      customerPhone,
      senderName,
      bankName,
      transactionReference,
    });

    res.status(201).json({ success: true, data: receipt });
  } catch (err) {
    next(err);
  }
}

// GET /api/receipts — all receipts for the business in the current session
async function listReceipts(req, res, next) {
  try {
    const { businessId } = req.user;

    const receipts = await receiptsService.getReceiptsForBusiness(businessId);

    res.status(200).json({ success: true, data: receipts });
  } catch (err) {
    next(err);
  }
}

// GET /api/receipts/:receiptId
async function getReceipt(req, res, next) {
  try {
    const { businessId } = req.user;
    const { receiptId } = req.params;

    const receipt = await receiptsService.getReceiptById({
      receiptId,
      businessId,
    });

    res.status(200).json({ success: true, data: receipt });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/receipts/:receiptId
async function updateReceipt(req, res, next) {
  try {
    const { businessId } = req.user;
    const { receiptId } = req.params;
    const {
      vendorName,
      amount,
      currency,
      receiptDate,
      notes,
      customerName,
      customerPhone,
      senderName,
      bankName,
      transactionReference,
    } = req.body;

    const receipt = await receiptsService.updateReceipt({
      receiptId,
      businessId,
      updates: {
        vendorName,
        amount,
        currency,
        receiptDate,
        notes,
        customerName,
        customerPhone,
        senderName,
        bankName,
        transactionReference,
      },
    });

    res.status(200).json({ success: true, data: receipt });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/receipts/:receiptId
async function deleteReceipt(req, res, next) {
  try {
    const { businessId } = req.user;
    const { receiptId } = req.params;

    const result = await receiptsService.deleteReceipt({
      receiptId,
      businessId,
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// GET /api/receipts/:receiptId/image-url — returns a fresh, short-lived
// signed URL for this receipt's screenshot. Call on demand, never cache.
async function getReceiptImageUrl(req, res, next) {
  try {
    const { businessId } = req.user;
    const { receiptId } = req.params;

    const result = await receiptsService.getReceiptImageUrl({
      receiptId,
      businessId,
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/receipts/:receiptId/verify
async function setVerificationStatus(req, res, next) {
  try {
    const { businessId } = req.user;
    const { receiptId } = req.params;
    const { status } = req.body;

    const receipt = await receiptsService.setVerificationStatus({
      receiptId,
      businessId,
      status,
    });

    res.status(200).json({ success: true, data: receipt });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/receipts/:receiptId/resolve-duplicate
async function resolveDuplicateFlag(req, res, next) {
  try {
    const { businessId } = req.user;
    const { receiptId } = req.params;
    const { isDuplicate } = req.body;

    const receipt = await receiptsService.resolveDuplicateFlag({
      receiptId,
      businessId,
      isDuplicate,
    });

    res.status(200).json({ success: true, data: receipt });
  } catch (err) {
    next(err);
  }
}

// GET /api/receipts/stats — this business's own stats
async function getBusinessStats(req, res, next) {
  try {
    const { businessId } = req.user;

    const stats = await receiptsService.getBusinessReceiptStats(businessId);

    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}

async function createBulkReceipts(req, res, next) {
  try {
    const { userId, businessId } = req.user;
    const files = req.files || [];
    if (!files.length) {
      throw new ApiError(400, "No files uploaded");
    }
    const { defaultVendorName } = req.body; // optional
    const result = await receiptsService.createBulkReceipts({
      businessId,
      uploadedBy: userId,
      files,
      defaultVendorName,
    });
    res.status(202).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createReceipt,
  listReceipts,
  getReceipt,
  updateReceipt,
  deleteReceipt,
  getReceiptImageUrl,
  setVerificationStatus,
  resolveDuplicateFlag,
  createBulkReceipts,
  getBusinessStats,
};
