const crypto = require("crypto");
const receiptsRepository = require("./receipts.repository");
const {
  uploadReceiptScreenshot,
  getSignedReceiptUrl,
  deleteReceiptScreenshot,
} = require("../../utils/receiptsStorage");
const { extractReceiptFields } = require("../../utils/ocr");
const ApiError = require("../../utils/apiError");

// ---- Search & Filters (PRD 5.7 / 5.8) ----
const VALID_VERIFICATION_STATUSES = ["pending", "verified", "rejected"];
const VALID_DUPLICATE_STATUSES = [
  "none",
  "flagged",
  "confirmed_duplicate",
  "not_duplicate",
];
const VALID_DATE_PRESETS = ["today", "yesterday", "last_week", "last_month"];

// Resolves a 5.8 filter preset into { dateFrom, dateTo } as "YYYY-MM-DD"
// strings, matching the DATE type-parser fix in database.js (raw string,
// no Date object timezone round-trip) so this can't reintroduce the
// off-by-one-day bug described in section 9 of the progress log.
// Boundaries are computed on UTC year/month/day components (not ms
// arithmetic) so they don't drift across DST or month-length changes.
function resolveDatePreset(preset) {
  const now = new Date();
  const toDateString = (d) => d.toISOString().slice(0, 10);
  const startOfDay = (d) =>
    new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const today = startOfDay(now);

  switch (preset) {
    case "today": {
      const d = toDateString(today);
      return { dateFrom: d, dateTo: d };
    }
    case "yesterday": {
      const y = new Date(today);
      y.setUTCDate(y.getUTCDate() - 1);
      const d = toDateString(y);
      return { dateFrom: d, dateTo: d };
    }
    case "last_week": {
      const from = new Date(today);
      from.setUTCDate(from.getUTCDate() - 7);
      return { dateFrom: toDateString(from), dateTo: toDateString(today) };
    }
    case "last_month": {
      const from = new Date(today);
      from.setUTCMonth(from.getUTCMonth() - 1);
      return { dateFrom: toDateString(from), dateTo: toDateString(today) };
    }
    default:
      throw new ApiError(400, `Unknown date preset: ${preset}`);
  }
}

// req.query values arrive as strings (or undefined) regardless of the
// underlying type, since they come off a URL query string.
async function searchReceipts({ businessId, query }) {
  const {
    customer,
    bank,
    reference,
    employee,
    verificationStatus,
    duplicateStatus,
    minAmount,
    maxAmount,
    date, // convenience: single date, expands to dateFrom = dateTo = date
    dateFrom,
    dateTo,
    uploadDateFrom,
    uploadDateTo,
    datePreset, // 'today' | 'yesterday' | 'last_week' | 'last_month'
  } = query;

  if (
    verificationStatus &&
    !VALID_VERIFICATION_STATUSES.includes(verificationStatus)
  ) {
    throw new ApiError(
      400,
      `Invalid verificationStatus: ${verificationStatus}`,
    );
  }

  if (duplicateStatus && !VALID_DUPLICATE_STATUSES.includes(duplicateStatus)) {
    throw new ApiError(400, `Invalid duplicateStatus: ${duplicateStatus}`);
  }

  if (datePreset && !VALID_DATE_PRESETS.includes(datePreset)) {
    throw new ApiError(400, `Invalid datePreset: ${datePreset}`);
  }

  if (
    minAmount !== undefined &&
    maxAmount !== undefined &&
    Number(minAmount) > Number(maxAmount)
  ) {
    throw new ApiError(400, "minAmount cannot be greater than maxAmount");
  }

  let resolvedDateFrom = dateFrom;
  let resolvedDateTo = dateTo;

  // datePreset (5.8 filter chips) takes precedence over manual
  // dateFrom/dateTo/date (5.7 free-form search) if both are somehow sent.
  if (datePreset) {
    const resolved = resolveDatePreset(datePreset);
    resolvedDateFrom = resolved.dateFrom;
    resolvedDateTo = resolved.dateTo;
  } else if (date) {
    resolvedDateFrom = date;
    resolvedDateTo = date;
  }

  return receiptsRepository.searchReceiptsByBusiness(businessId, {
    customer,
    bank,
    reference,
    employee,
    verificationStatus,
    duplicateStatus,
    minAmount: minAmount !== undefined ? Number(minAmount) : undefined,
    maxAmount: maxAmount !== undefined ? Number(maxAmount) : undefined,
    dateFrom: resolvedDateFrom,
    dateTo: resolvedDateTo,
    uploadDateFrom,
    uploadDateTo,
  });
}

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

// Drafts (upload_status = 'draft') are excluded from the duplicate pool
// at the repository layer — an unconfirmed draft should never flag
// itself or another in-progress/abandoned draft.
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

// Creates a receipt as a DRAFT (upload_status = 'draft', set by the
// repository on insert). Drafts are invisible to every business-facing
// read path (list/search/stats/duplicate detection) until the user
// confirms via updateReceipt (Save on the Review screen), which flips
// upload_status to 'confirmed'. This keeps the upload->OCR->poll flow
// working exactly as before — OCR still needs a real receipt_id to
// write into and poll against — while nothing is "really" saved from
// the business's point of view until the user reviews and saves it.
async function createReceipt({
  businessId,
  uploadedBy,
  receiverName, // required only for manual entry; OCR fills this in when a screenshot is attached
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
}) {
  const hasScreenshot = Boolean(fileBuffer);

  // receiverName/amount/receiptDate requiredness is already enforced by
  // the Joi schema (receipts.validation.js) using the same hasScreenshot
  // conditional — no need to duplicate that check here. When a screenshot
  // is attached, these are legitimately null until OCR runs.
  if (!hasScreenshot && (!amount || !receiptDate || !receiverName)) {
    throw new ApiError(
      400,
      "receiverName, amount and receiptDate are required when no screenshot is attached",
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

  // Draft rows are excluded from duplicate detection (see
  // findPotentialDuplicates), so this only flags against already
  // confirmed receipts — which is fine to compute now and re-check at
  // OCR time and again at save time.
  const { duplicateStatus } = await checkForDuplicates({
    businessId,
    transactionReference,
    screenshotHash,
  });

  const receipt = await receiptsRepository.createReceipt({
    businessId,
    uploadedBy,
    receiverName,
    amount,
    currency: currency || "PKR",
    receiptDate,
    notes,
    imageUrl,
    senderName,
    senderBank,
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

// Runs in the background
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
        // Still excludes other drafts (see findPotentialDuplicates) —
        // only flags against already-confirmed receipts.
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

// This is what "Save receipt" on the Review screen calls (PATCH
// /receipts/:id). It both applies the user's edits AND confirms the
// draft (upload_status: 'draft' -> 'confirmed'), which is the moment
// the receipt actually becomes visible to the rest of the business —
// lists, stats, duplicate detection against future uploads, etc.
async function updateReceipt({ receiptId, businessId, updates }) {
  const existing = await receiptsRepository.findReceiptById(receiptId);
  assertReceiptBelongsToBusiness(existing, businessId);

  if (updates.transactionReference) {
    // Re-check now that the reference is user-confirmed. Still excludes
    // other drafts, but this receipt is about to become 'confirmed'
    // itself, so from here on it will correctly show up as a match
    // target for anything uploaded after it.
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

  return receiptsRepository.updateReceipt(receiptId, {
    ...updates,
    uploadStatus: "confirmed",
  });
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

async function createBulkReceipts({
  businessId,
  uploadedBy,
  files,
  // No "Unknown" default here anymore — if this is left unset, receipts
  // are created with receiverName: null so runOcrForReceipt's autofill
  // (which only fills a field when it's currently empty) can actually
  // set it from what the AI reads off the screenshot. Only used as an
  // upfront value when the caller explicitly provides one.
  defaultReceiverName = null,
}) {
  const total = files.length;
  const batch = await receiptsRepository.createBatch({
    businessId,
    uploadedBy,
    totalFiles: total,
  });

  let processed = 0,
    failed = 0;
  // Collected so the caller can hand these straight to a one-by-one
  // review flow (PATCH /receipts/:id per item) without needing a
  // separate "list receipts in this batch" endpoint — there's no
  // batch_id column on receipts to query by.
  const createdReceipts = [];

  for (const file of files) {
    try {
      const receipt = await createReceipt({
        businessId,
        uploadedBy,
        receiverName: defaultReceiverName || undefined,
        fileBuffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        // all other fields left null; OCR will fill them
      });
      createdReceipts.push(receipt);
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

  return {
    batchId: batch.batch_id,
    processed,
    failed,
    total,
    receipts: createdReceipts,
  };
}

// Deletes drafts abandoned before the user reached/completed Review
// (upload_status = 'draft' older than olderThanHours). Intended to be
// called from a scheduled job (cron, etc.) — not wired to any route.
// Removes the storage object for each draft's screenshot before
// deleting the row, same cleanup order as deleteReceipt.
async function cleanupStaleDrafts(olderThanHours = 24) {
  const staleDrafts = await receiptsRepository.findStaleDrafts(olderThanHours);

  for (const draft of staleDrafts) {
    if (draft.image_url) {
      try {
        await deleteReceiptScreenshot(draft.image_url);
      } catch (err) {
        console.error(
          `Failed to delete screenshot for stale draft ${draft.receipt_id}:`,
          err.message,
        );
        // Continue anyway — better to drop the DB row and leak a storage
        // object than to leave a stale draft row behind indefinitely.
      }
    }
  }

  const deleted = await receiptsRepository.deleteStaleDrafts(olderThanHours);
  return { deletedCount: deleted.length };
}

module.exports = {
  createReceipt,
  runOcrForReceipt,
  getReceiptsForBusiness,
  searchReceipts,
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
  cleanupStaleDrafts,
};