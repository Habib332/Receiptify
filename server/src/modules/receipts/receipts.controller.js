const receiptsService = require("./receipts.service");

// POST /api/receipts
async function createReceipt(req, res, next) {
  try {
    const { userId, businessId } = req.user; // from sessionToken via auth.middleware
    const { vendorName, amount, currency, receiptDate, notes, imageUrl } =
      req.body;

    const receipt = await receiptsService.createReceipt({
      businessId,
      uploadedBy: userId,
      vendorName,
      amount,
      currency,
      receiptDate,
      notes,
      imageUrl,
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
    const { vendorName, amount, currency, receiptDate, notes, imageUrl } =
      req.body;

    const receipt = await receiptsService.updateReceipt({
      receiptId,
      businessId,
      updates: { vendorName, amount, currency, receiptDate, notes, imageUrl },
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

module.exports = {
  createReceipt,
  listReceipts,
  getReceipt,
  updateReceipt,
  deleteReceipt,
  getBusinessStats,
};
