// receipts.service.js
const crypto = require("crypto");
const receiptsRepository = require("./receipts.repository");
const {
  uploadReceiptScreenshot,
  getSignedReceiptUrl,
  deleteReceiptScreenshot,
} = require("../../utils/receiptsStorage");
const { extractReceiptFields } = require("../../utils/ocr");
const ApiError = require("../../utils/apiError");

function assertReceiptBelongsToBusiness(receipt, businessId) {
  if (!receipt) {
    throw new ApiError(404, "Receipt not found");
  }
  if (receipt.business_id !== businessId) {
    throw new ApiError(403, "This receipt does not belong to your business");
  }
}

function computeScreenshotHash(fileBuffer) {
  if (!fileBuffer) return null;
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

async function checkForDuplicates({
  businessId,
  transactionReference,
  screenshotHash,
  excludeReceiptId = null,
}) {
  if (!transactionReference && !screenshotHash) {
    return { duplicateStatus: "none", matches: [] };
  }

  const matches = await receiptsRepository.findPotentialDuplicates({
    businessId,
    transactionReference,
    screenshotHash,
    excludeReceiptId,
  });

  return {
    duplicateStatus: matches.length > 0 ? "flagged" : "none",
    matches,
  };
}

async function createReceipt({
  businessId,
  uploadedBy,
  vendorName,
  amount,
  currency,
  receiptDate,
  notes,
  fileBuffer,
  originalName,
  mimeType,
  senderName,
  senderBank,
  receiverName,
  receiverBank,
  transactionReference,
}) {
  const hasScreenshot = Boolean(fileBuffer);

  if (!vendorName) {
    throw new ApiError(400, "vendorName is required");
  }

  if (!hasScreenshot && (!amount || !receiptDate)) {
    throw new ApiError(
      400,
      "amount and receiptDate are required when no screenshot is attached",
    );
  }

  let screenshotHash = null;
  let imageUrl = null;

  if (fileBuffer) {
    screenshotHash = computeScreenshotHash(fileBuffer);
    imageUrl = await uploadReceiptScreenshot({
      fileBuffer,
      originalName,
      mimeType,
      businessId,
    });
  }

  const { duplicateStatus } = await checkForDuplicates({
    businessId,
    transactionReference,
    screenshotHash,
  });

  const receipt = await receiptsRepository.createReceipt({
    businessId,
    uploadedBy,
    vendorName,
    amount,
    currency: currency || "PKR",
    receiptDate,
    notes,
    imageUrl,
    senderName,
    senderBank,
    receiverName,
    receiverBank,
    transactionReference,
    screenshotHash,
  });

  if (imageUrl) {
    runOcrForReceipt({
      receiptId: receipt.receipt_id,
      filePath: imageUrl,
    }).catch((err) => console.error("Unexpected OCR trigger error:", err));
  }

  if (duplicateStatus === "flagged") {
    return receiptsRepository.updateReceipt(receipt.receipt_id, {
      duplicateStatus,
    });
  }

  return receipt;
}

// Runs in the background — deliberately NOT awaited by createReceipt.
// Gemini structured extraction (see utils/ocr.js) returns senderName/
// senderBank/receiverName/receiverBank instead of the old single
// bankName field — auto-fill mirrors that same four-way split. No more
// ocrRawText/confidence fields since Gemini returns typed JSON directly.
async function runOcrForReceipt({ receiptId, filePath }) {
  try {
    await receiptsRepository.updateOcrResult(receiptId, {
      ocrStatus: "pending",
    });

    const signedUrl = await getSignedReceiptUrl(filePath);

    const extracted = await extractReceiptFields(signedUrl);

    await receiptsRepository.updateOcrResult(receiptId, {
      ocrStatus: "completed",
    });

    const current = await receiptsRepository.findReceiptById(receiptId);

    const autoFillUpdates = {};

    if (!current.amount && extracted.amount) {
      autoFillUpdates.amount = extracted.amount;
    }
    if (!current.transaction_reference && extracted.transactionReference) {
      autoFillUpdates.transactionReference = extracted.transactionReference;
    }
    if (!current.sender_name && extracted.senderName) {
      autoFillUpdates.senderName = extracted.senderName;
    }
    if (!current.sender_bank && extracted.senderBank) {
      autoFillUpdates.senderBank = extracted.senderBank;
    }
    if (!current.receiver_name && extracted.receiverName) {
      autoFillUpdates.receiverName = extracted.receiverName;
    }
    if (!current.receiver_bank && extracted.receiverBank) {
      autoFillUpdates.receiverBank = extracted.receiverBank;
    }
    if (!current.receipt_date && extracted.date) {
      autoFillUpdates.receiptDate = extracted.date;
    }

    if (Object.keys(autoFillUpdates).length > 0) {
      await receiptsRepository.updateReceipt(receiptId, autoFillUpdates);

      if (autoFillUpdates.transactionReference) {
        const { duplicateStatus } = await checkForDuplicates({
          businessId: current.business_id,
          transactionReference: autoFillUpdates.transactionReference,
          screenshotHash: current.screenshot_hash,
          excludeReceiptId: receiptId,
        });
        if (duplicateStatus === "flagged") {
          await receiptsRepository.updateReceipt(receiptId, {
            duplicateStatus,
          });
        }
      }
    }

    return extracted;
  } catch (err) {
    console.error(`OCR failed for receipt ${receiptId}:`, err.message);
    await receiptsRepository.updateOcrResult(receiptId, {
      ocrStatus: "failed",
    });
  }
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

  if (updates.transactionReference) {
    const { duplicateStatus } = await checkForDuplicates({
      businessId,
      transactionReference: updates.transactionReference,
      screenshotHash: existing.screenshot_hash,
      excludeReceiptId: receiptId,
    });
    if (duplicateStatus === "flagged") {
      updates.duplicateStatus = duplicateStatus;
    }
  }

  return receiptsRepository.updateReceipt(receiptId, updates);
}

async function deleteReceipt({ receiptId, businessId }) {
  const existing = await receiptsRepository.findReceiptById(receiptId);
  assertReceiptBelongsToBusiness(existing, businessId);

  await receiptsRepository.deleteReceipt(receiptId);

  if (existing.image_url) {
    await deleteReceiptScreenshot(existing.image_url);
  }

  return { receiptId };
}

async function getReceiptImageUrl({ receiptId, businessId }) {
  const receipt = await receiptsRepository.findReceiptById(receiptId);
  assertReceiptBelongsToBusiness(receipt, businessId);

  if (!receipt.image_url) {
    throw new ApiError(404, "This receipt has no screenshot attached");
  }

  const signedUrl = await getSignedReceiptUrl(receipt.image_url);
  return { signedUrl };
}

async function resolveDuplicateFlag({ receiptId, businessId, isDuplicate }) {
  const existing = await receiptsRepository.findReceiptById(receiptId);
  assertReceiptBelongsToBusiness(existing, businessId);

  if (existing.duplicate_status !== "flagged") {
    throw new ApiError(
      400,
      "This receipt is not currently flagged as a duplicate",
    );
  }

  return receiptsRepository.updateReceipt(receiptId, {
    duplicateStatus: isDuplicate ? "confirmed_duplicate" : "not_duplicate",
  });
}

async function setVerificationStatus({ receiptId, businessId, status }) {
  const existing = await receiptsRepository.findReceiptById(receiptId);
  assertReceiptBelongsToBusiness(existing, businessId);

  return receiptsRepository.updateReceipt(receiptId, {
    verificationStatus: status,
  });
}

async function getBusinessReceiptStats(businessId) {
  const [count, totalSpent, pendingVerification, flaggedDuplicates] =
    await Promise.all([
      receiptsRepository.countReceiptsByBusiness(businessId),
      receiptsRepository.getTotalSpentByBusiness(businessId),
      receiptsRepository.countPendingVerificationByBusiness(businessId),
      receiptsRepository.countFlaggedDuplicatesByBusiness(businessId),
    ]);

  return {
    receiptCount: count,
    totalSpent: Number(totalSpent),
    pendingVerification,
    flaggedDuplicates,
  };
}

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
      : null,
  };
}

// Sequential on purpose (not Promise.all) — each call already fires its
// own background OCR job (see createReceipt); running 50 of those
// concurrently on top of 50 concurrent uploads would spike Gemini API
// concurrency and Supabase Storage writes at once. Bulk upload already
// responds 202 immediately (see receipts.controller.js), so the caller
// isn't blocked waiting on this loop either way.
async function createBulkReceipts({
  businessId,
  uploadedBy,
  files, // array of { buffer, originalname, mimetype }
  defaultVendorName = "Unknown",
}) {
  const total = files.length;
  const batch = await receiptsRepository.createBatch({
    businessId,
    uploadedBy,
    totalFiles: total,
  });

  let processed = 0,
    failed = 0;

  for (const file of files) {
    try {
      await createReceipt({
        businessId,
        uploadedBy,
        vendorName: defaultVendorName,
        fileBuffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        // all other fields left null; OCR will fill them
      });
      processed++;
    } catch (err) {
      console.error(`Bulk: failed to process ${file.originalname}`, err);
      failed++;
    }
  }

  await receiptsRepository.updateBatch(batch.batch_id, {
    processedFiles: processed,
    failedFiles: failed,
    status: failed === total ? "failed" : "completed",
  });

  return { batchId: batch.batch_id, processed, failed, total };
}

module.exports = {
  createReceipt,
  runOcrForReceipt,
  getReceiptsForBusiness,
  getReceiptById,
  updateReceipt,
  deleteReceipt,
  getReceiptImageUrl,
  resolveDuplicateFlag,
  setVerificationStatus,
  getBusinessReceiptStats,
  getSystemReceiptStats,
  computeScreenshotHash,
  createBulkReceipts,
};
