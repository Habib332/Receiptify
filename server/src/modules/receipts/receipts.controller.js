const receiptsService = require("./receipts.service");
const ApiError = require("../../utils/apiError");
const receiptsExportService = require("./receipts.export.service");
// POST /api/receipts
async function createReceipt(req, res, next) {
  try {
    const { userId, businessId } = req.user;
    const {
      receiverName,
      amount,
      currency,
      receiptDate,
      notes,
      senderName,
      senderBank,
      receiverBank,
      transactionReference,
    } = req.body;

    const fileBuffer = req.file ? req.file.buffer : undefined;
    const originalName = req.file ? req.file.originalname : undefined;
    const mimeType = req.file ? req.file.mimetype : undefined;

    const receipt = await receiptsService.createReceipt({
      businessId,
      uploadedBy: userId,
      receiverName,
      amount,
      currency,
      receiptDate,
      notes,
      fileBuffer,
      originalName,
      mimeType,
      senderName,
      senderBank,
      receiverBank,
      transactionReference,
    });

    res.status(201).json({ success: true, data: receipt });
  } catch (err) {
    next(err);
  }
}

// GET /api/receipts
// Search & filters (PRD 5.7 / 5.8) are query params on this same route,
// not a separate endpoint — e.g. GET /api/receipts?customer=Ali or
// GET /api/receipts?datePreset=last_week. No query params -> original,
// unfiltered list behavior (unchanged from before this feature).
async function listReceipts(req, res, next) {
  try {
    const { businessId } = req.user;
    const hasSearchParams = Object.keys(req.query).length > 0;

    const receipts = hasSearchParams
      ? await receiptsService.searchReceipts({ businessId, query: req.query })
      : await receiptsService.getReceiptsForBusiness(businessId);

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
      receiverName,
      amount,
      currency,
      receiptDate,
      notes,
      senderName,
      senderBank,
      receiverBank,
      transactionReference,
    } = req.body;

    const receipt = await receiptsService.updateReceipt({
      receiptId,
      businessId,
      updates: {
        receiverName,
        amount,
        currency,
        receiptDate,
        notes,
        senderName,
        senderBank,
        receiverBank,
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

// GET /api/receipts/:receiptId/image-url
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

// GET /api/receipts/stats
async function getBusinessStats(req, res, next) {
  try {
    const { businessId } = req.user;
    const stats = await receiptsService.getBusinessReceiptStats(businessId);
    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}

// POST /api/receipts/bulk
async function createBulkReceipts(req, res, next) {
  try {
    const { userId, businessId } = req.user;
    const files = req.files || [];
    if (!files.length) {
      throw new ApiError(400, "No files uploaded");
    }
    const { defaultReceiverName } = req.body;
    const result = await receiptsService.createBulkReceipts({
      businessId,
      uploadedBy: userId,
      files,
      defaultReceiverName,
    });
    res.status(202).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// GET /api/receipts/export?format=csv|excel|pdf&<same filters as GET /api/receipts>
async function exportReceipts(req, res, next) {
  try {
    const { businessId } = req.user;
    const { format, ...filters } = req.query;

    const exporters = {
      csv: receiptsExportService.exportReceiptsAsCsv,
      excel: receiptsExportService.exportReceiptsAsExcel,
      pdf: receiptsExportService.exportReceiptsAsPdf,
    };

    const exportFn = exporters[format];
    if (!exportFn) {
      throw new ApiError(400, "Invalid format — must be one of: csv, excel, pdf");
    }

    const { buffer, filename, contentType } = await exportFn({ businessId, filters });

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(buffer);
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
  exportReceipts,
};
