const receiptsRepository = require("./receipts.repository");
const ApiError = require("../../utils/apiError");

// Guards against a valid sessionToken for Business A being used to touch
// Business B's receipts. RBAC (allowRoles) only checks role — it has no
// idea which business a given receipt belongs to. This is that missing check.
function assertReceiptBelongsToBusiness(receipt, businessId) {
  if (!receipt) {
    throw new ApiError(404, "Receipt not found");
  }
  if (receipt.business_id !== businessId) {
    throw new ApiError(403, "This receipt does not belong to your business");
  }
}

async function createReceipt({
  businessId,
  uploadedBy,
  vendorName,
  amount,
  currency,
  receiptDate,
  notes,
  imageUrl,
}) {
  if (!vendorName || !amount || !receiptDate) {
    throw new ApiError(400, "vendorName, amount, and receiptDate are required");
  }

  return receiptsRepository.createReceipt({
    businessId,
    uploadedBy,
    vendorName,
    amount,
    currency: currency || "PKR",
    receiptDate,
    notes,
    imageUrl,
  });
}

async function getReceiptsForBusiness(businessId) {
  return receiptsRepository.getReceiptsByBusiness(businessId);
}

async function getReceiptById({ receiptId, businessId }) {
  const receipt = await receiptsRepository.findReceiptById(receiptId);
  assertReceiptBelongsToBusiness(receipt, businessId);
  return receipt;
}

async function updateReceipt({ receiptId, businessId, updates }) {
  const existing = await receiptsRepository.findReceiptById(receiptId);
  assertReceiptBelongsToBusiness(existing, businessId);

  return receiptsRepository.updateReceipt(receiptId, updates);
}

async function deleteReceipt({ receiptId, businessId }) {
  const existing = await receiptsRepository.findReceiptById(receiptId);
  assertReceiptBelongsToBusiness(existing, businessId);

  await receiptsRepository.deleteReceipt(receiptId);
  return { receiptId };
}

// Per-business stats — e.g. for a single business's detail page.
async function getBusinessReceiptStats(businessId) {
  const [count, totalSpent] = await Promise.all([
    receiptsRepository.countReceiptsByBusiness(businessId),
    receiptsRepository.getTotalSpentByBusiness(businessId),
  ]);

  return { receiptCount: count, totalSpent: Number(totalSpent) };
}

// System-wide stats — feeds the dashboard's "Total Receipts" and "Most Used" cards.
async function getSystemReceiptStats() {
  const [totalReceipts, mostUsed] = await Promise.all([
    receiptsRepository.countAllReceipts(),
    receiptsRepository.getMostUsedBusiness(),
  ]);

  return {
    totalReceipts,
    mostUsed: mostUsed
      ? {
          businessId: mostUsed.business_id,
          name: mostUsed.name,
          receiptCount: mostUsed.receipt_count,
        }
      : null, // no receipts anywhere yet
  };
}

module.exports = {
  createReceipt,
  getReceiptsForBusiness,
  getReceiptById,
  updateReceipt,
  deleteReceipt,
  getBusinessReceiptStats,
  getSystemReceiptStats,
};
