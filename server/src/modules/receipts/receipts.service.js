const crypto = require("crypto");
const receiptsRepository = require("./receipts.repository");
const {
  uploadReceiptScreenshot,
  getSignedReceiptUrl,
  deleteReceiptScreenshot,
} = require("../../utils/receiptsStorage");
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

// Fingerprints the raw image bytes so the exact same screenshot can be
// recognized on a second upload even before any OCR/transaction reference
// exists. Pure function of the buffer — same bytes always produce the
// same hash, different bytes (even by one pixel) produce a different one.
function computeScreenshotHash(fileBuffer) {
  if (!fileBuffer) return null;
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

// Runs the two duplicate signals (PRD 5.6) against existing receipts in
// the SAME business only. Returns the flag to store, not a thrown error —
// a potential duplicate is something a human should review and decide on,
// not something that blocks the upload outright.
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
  fileBuffer, // raw bytes from multer, if a screenshot was attached — optional
  originalName,
  mimeType,
  customerName,
  customerPhone,
  senderName,
  bankName,
  transactionReference,
}) {
  if (!vendorName || !amount || !receiptDate) {
    throw new ApiError(400, "vendorName, amount, and receiptDate are required");
  }

  // Both the hash and the actual upload only happen if a screenshot was
  // attached — a receipt can still be created from manual entry alone,
  // with no image, in which case both stay null.
  let screenshotHash = null;
  let imageUrl = null; // actually a storage PATH, not a URL — see note below

  if (fileBuffer) {
    screenshotHash = computeScreenshotHash(fileBuffer);
    // Uploads to the PRIVATE receipt-screenshots bucket and gets back a
    // file PATH (e.g. "42/173-abc.png"), not a public URL — this bucket
    // has no public access, unlike business logos. The path is what's
    // stored in receipts.image_url; an actual viewable link is generated
    // fresh, on demand, by getReceiptImageUrl() below, and is never
    // itself persisted since it expires.
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
    customerName,
    customerPhone,
    senderName,
    bankName,
    transactionReference,
    screenshotHash,
  });

  // Duplicate status can't be set at INSERT time above (schema default is
  // 'none' and we only just computed it), so it's set via a second call
  // when a match was actually found — the common case (no duplicate)
  // avoids the extra query entirely.
  if (duplicateStatus === "flagged") {
    return receiptsRepository.updateReceipt(receipt.receipt_id, {
      duplicateStatus,
    });
  }

  return receipt;
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

  // Re-run duplicate detection if the transaction reference is changing,
  // since a manual edit could turn a previously-unique receipt into a
  // match for another one already on file (or vice versa — re-checking
  // doesn't automatically clear an existing 'flagged' status, since that
  // still requires a human decision either way).
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

  // Best-effort cleanup so the bucket doesn't accumulate orphaned files.
  // deleteReceiptScreenshot swallows its own errors (logs, doesn't throw)
  // so a storage-side failure never blocks the receipt row itself from
  // being deleted — the row is the source of truth, not the file.
  if (existing.image_url) {
    await deleteReceiptScreenshot(existing.image_url);
  }

  return { receiptId };
}

// Generates a fresh, short-lived signed URL for a receipt's screenshot.
// Call this every time the frontend actually needs to display the image —
// the result is never stored, since it expires (default 1 hour, see
// receiptsStorage.js) and would go stale sitting in a database column.
async function getReceiptImageUrl({ receiptId, businessId }) {
  const receipt = await receiptsRepository.findReceiptById(receiptId);
  assertReceiptBelongsToBusiness(receipt, businessId);

  if (!receipt.image_url) {
    throw new ApiError(404, "This receipt has no screenshot attached");
  }

  // receipt.image_url actually holds a storage PATH, not a URL — same
  // naming kept as the database column for consistency, but the value
  // itself is only ever a path for receipts (unlike business logos).
  const signedUrl = await getSignedReceiptUrl(receipt.image_url);
  return { signedUrl };
}

// Owner/manager decide a flagged receipt is or isn't actually a duplicate.
// Kept separate from the general updateReceipt so this specific decision
// is explicit in the API, not buried inside a generic PATCH body.
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

// Owner/manager marks a receipt as verified or rejected (PRD 5.5).
async function setVerificationStatus({ receiptId, businessId, status }) {
  const existing = await receiptsRepository.findReceiptById(receiptId);
  assertReceiptBelongsToBusiness(existing, businessId);

  return receiptsRepository.updateReceipt(receiptId, {
    verificationStatus: status,
  });
}

// Per-business stats — e.g. for a single business's detail page.
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
  getReceiptImageUrl,
  resolveDuplicateFlag,
  setVerificationStatus,
  getBusinessReceiptStats,
  getSystemReceiptStats,
  computeScreenshotHash, // exported for reuse if a signed-URL upload flow computes the hash separately
};
