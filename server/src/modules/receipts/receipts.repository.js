const pool = require("../../config/database");

// upload_status distinguishes an OCR/upload draft (not yet confirmed by
// the user on the Review screen) from a confirmed receipt. This is
// separate from verification_status, which is the PRD 5.5 owner/manager
// verify-after-the-fact workflow — the two are independent axes.
//
// All read paths that power business-facing views (list, search, stats,
// duplicate detection) filter to upload_status = 'confirmed' so drafts
// are invisible until the user hits Save. findReceiptById does NOT
// filter, since the Review page needs to fetch/poll its own draft by id.

async function createReceipt({
  businessId,
  uploadedBy,
  receiverName, // required: the payee/vendor
  amount,
  currency,
  receiptDate,
  notes,
  imageUrl,
  senderName,
  senderBank,
  receiverBank,
  transactionReference,
  screenshotHash,
}) {
  const result = await pool.query(
    `INSERT INTO receipts
       (business_id, uploaded_by, receiver_name, amount, currency, receipt_date, notes, image_url,
        sender_name, sender_bank, receiver_bank, transaction_reference, screenshot_hash, upload_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'draft')
     RETURNING *`,
    [
      businessId,
      uploadedBy,
      receiverName,
      amount,
      currency,
      receiptDate,
      notes,
      imageUrl,
      senderName,
      senderBank,
      receiverBank,
      transactionReference,
      screenshotHash,
    ],
  );
  return result.rows[0];
}

async function findReceiptById(receiptId) {
  // Intentionally unfiltered by upload_status — Review page needs to
  // fetch/poll its own draft by id before it's confirmed.
  const result = await pool.query(
    `SELECT * FROM receipts WHERE receipt_id = $1`,
    [receiptId],
  );
  return result.rows[0];
}

async function getReceiptsByBusiness(businessId) {
  const result = await pool.query(
    `SELECT * FROM receipts
     WHERE business_id = $1 AND upload_status = 'confirmed'
     ORDER BY receipt_date DESC`,
    [businessId],
  );
  return result.rows;
}

async function updateReceipt(
  receiptId,
  {
    receiverName,
    amount,
    currency,
    receiptDate,
    notes,
    imageUrl,
    senderName,
    senderBank,
    receiverBank,
    transactionReference,
    screenshotHash,
    verificationStatus,
    duplicateStatus,
    uploadStatus,
  },
) {
  const result = await pool.query(
    `UPDATE receipts
     SET receiver_name = COALESCE($2, receiver_name),
         amount = COALESCE($3, amount),
         currency = COALESCE($4, currency),
         receipt_date = COALESCE($5, receipt_date),
         notes = COALESCE($6, notes),
         image_url = COALESCE($7, image_url),
         sender_name = COALESCE($8, sender_name),
         sender_bank = COALESCE($9, sender_bank),
         receiver_bank = COALESCE($10, receiver_bank),
         transaction_reference = COALESCE($11, transaction_reference),
         screenshot_hash = COALESCE($12, screenshot_hash),
         verification_status = COALESCE($13, verification_status),
         duplicate_status = COALESCE($14, duplicate_status),
         upload_status = COALESCE($15, upload_status)
     WHERE receipt_id = $1
     RETURNING *`,
    [
      receiptId,
      receiverName,
      amount,
      currency,
      receiptDate,
      notes,
      imageUrl,
      senderName,
      senderBank,
      receiverBank,
      transactionReference,
      screenshotHash,
      verificationStatus,
      duplicateStatus,
      uploadStatus,
    ],
  );
  return result.rows[0];
}

async function deleteReceipt(receiptId) {
  const result = await pool.query(
    `DELETE FROM receipts WHERE receipt_id = $1 RETURNING receipt_id`,
    [receiptId],
  );
  return result.rows[0];
}

// ---- Duplicate detection ----
// Excludes drafts from the match pool — an unconfirmed draft (still
// uploading, or abandoned) should never flag itself or another
// in-progress draft as a duplicate. Only confirmed receipts count.
async function findPotentialDuplicates({
  businessId,
  transactionReference,
  screenshotHash,
  excludeReceiptId = null,
}) {
  const conditions = ["business_id = $1", "upload_status = 'confirmed'"];
  const values = [businessId];
  const matchConditions = [];

  if (transactionReference) {
    values.push(transactionReference);
    matchConditions.push(`transaction_reference = $${values.length}`);
  }

  if (screenshotHash) {
    values.push(screenshotHash);
    matchConditions.push(`screenshot_hash = $${values.length}`);
  }

  if (matchConditions.length === 0) {
    return [];
  }

  conditions.push(`(${matchConditions.join(" OR ")})`);

  if (excludeReceiptId) {
    values.push(excludeReceiptId);
    conditions.push(`receipt_id <> $${values.length}`);
  }

  const result = await pool.query(
    `SELECT * FROM receipts WHERE ${conditions.join(" AND ")}`,
    values,
  );
  return result.rows;
}

// ---- Stats ----
async function countReceiptsByBusiness(businessId) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count FROM receipts
     WHERE business_id = $1 AND upload_status = 'confirmed'`,
    [businessId],
  );
  return result.rows[0].count;
}

async function getTotalSpentByBusiness(businessId) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM receipts
     WHERE business_id = $1 AND upload_status = 'confirmed'`,
    [businessId],
  );
  return result.rows[0].total;
}

async function countAllReceipts() {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count FROM receipts WHERE upload_status = 'confirmed'`,
  );
  return result.rows[0].count;
}

async function getMostUsedBusiness() {
  const result = await pool.query(
    `SELECT b.business_id, b.name, COUNT(r.receipt_id)::int AS receipt_count
     FROM businesses b
     JOIN receipts r ON r.business_id = b.business_id
     WHERE r.upload_status = 'confirmed'
     GROUP BY b.business_id, b.name
     ORDER BY receipt_count DESC
     LIMIT 1`,
  );
  return result.rows[0];
}

async function countPendingVerificationByBusiness(businessId) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count FROM receipts
     WHERE business_id = $1 AND verification_status = 'pending' AND upload_status = 'confirmed'`,
    [businessId],
  );
  return result.rows[0].count;
}

async function countFlaggedDuplicatesByBusiness(businessId) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count FROM receipts
     WHERE business_id = $1 AND duplicate_status = 'flagged' AND upload_status = 'confirmed'`,
    [businessId],
  );
  return result.rows[0].count;
}

// ---- Search & Filters (PRD 5.7 / 5.8) ----
//
// All filters optional; only the ones present are applied. Free-text
// fields (customer/bank/reference/employee) use ILIKE for partial,
// case-insensitive matching. Enum fields (verificationStatus,
// duplicateStatus) use exact "=" match — they're validated against the
// schema's CHECK constraints one layer up, in receipts.service.js.
//
// "employee" has no column on receipts itself — uploaded_by is a user_id
// FK, not a name — so this LEFT JOINs users to search/filter by name.
// LEFT (not INNER) so a receipt is never silently dropped from results
// just because the join target is missing; it only matters when the
// caller is actively filtering by employee.
//
// Always scoped to upload_status = 'confirmed' — drafts never appear in
// search results.
async function searchReceiptsByBusiness(businessId, filters = {}) {
  const {
    customer, // -> sender_name ILIKE (PRD "Customer", mapped per schema)
    bank, // -> sender_bank ILIKE (sender side only, per project decision)
    reference, // -> transaction_reference ILIKE
    employee, // -> users.name ILIKE, joined via uploaded_by
    verificationStatus, // -> verification_status = (exact, enum)
    duplicateStatus, // -> duplicate_status = (exact, enum)
    minAmount, // -> amount >= (inclusive)
    maxAmount, // -> amount <= (inclusive)
    dateFrom, // -> receipt_date >= (inclusive)
    dateTo, // -> receipt_date <= (inclusive)
    uploadDateFrom, // -> created_at >= (inclusive)
    uploadDateTo, // -> created_at <= (inclusive)
  } = filters;

  const conditions = ["r.business_id = $1", "r.upload_status = 'confirmed'"];
  const values = [businessId];

  function addCondition(sqlWithPlaceholder, value) {
    values.push(value);
    conditions.push(sqlWithPlaceholder.replace("?", `$${values.length}`));
  }

  if (customer) {
    addCondition("r.sender_name ILIKE ?", `%${customer}%`);
  }

  if (bank) {
    addCondition("r.sender_bank ILIKE ?", `%${bank}%`);
  }

  if (reference) {
    addCondition("r.transaction_reference ILIKE ?", `%${reference}%`);
  }

  if (employee) {
    addCondition("u.name ILIKE ?", `%${employee}%`);
  }

  if (verificationStatus) {
    addCondition("r.verification_status = ?", verificationStatus);
  }

  if (duplicateStatus) {
    addCondition("r.duplicate_status = ?", duplicateStatus);
  }

  if (minAmount !== undefined && minAmount !== null) {
    addCondition("r.amount >= ?", minAmount);
  }

  if (maxAmount !== undefined && maxAmount !== null) {
    addCondition("r.amount <= ?", maxAmount);
  }

  if (dateFrom) {
    addCondition("r.receipt_date >= ?", dateFrom);
  }

  if (dateTo) {
    addCondition("r.receipt_date <= ?", dateTo);
  }

  if (uploadDateFrom) {
    addCondition("r.created_at >= ?", uploadDateFrom);
  }

  if (uploadDateTo) {
    addCondition("r.created_at <= ?", uploadDateTo);
  }

  const result = await pool.query(
    `SELECT r.*
     FROM receipts r
     LEFT JOIN users u ON u.user_id = r.uploaded_by
     WHERE ${conditions.join(" AND ")}
     ORDER BY r.receipt_date DESC NULLS LAST, r.created_at DESC`,
    values,
  );
  return result.rows;
}

// ---- OCR ----
async function updateOcrResult(receiptId, { ocrStatus }) {
  const result = await pool.query(
    `UPDATE receipts
     SET ocr_status = COALESCE($2, ocr_status)
     WHERE receipt_id = $1
     RETURNING *`,
    [receiptId, ocrStatus],
  );
  return result.rows[0];
}

// ---- Batch upload ----
async function createBatch({ businessId, uploadedBy, totalFiles }) {
  const result = await pool.query(
    `INSERT INTO upload_batches (business_id, uploaded_by, total_files)
     VALUES ($1, $2, $3) RETURNING *`,
    [businessId, uploadedBy, totalFiles],
  );
  return result.rows[0];
}

async function updateBatch(batchId, { processedFiles, failedFiles, status }) {
  const result = await pool.query(
    `UPDATE upload_batches
     SET processed_files = COALESCE($2, processed_files),
         failed_files = COALESCE($3, failed_files),
         status = COALESCE($4, status),
         updated_at = CURRENT_TIMESTAMP
     WHERE batch_id = $1
     RETURNING *`,
    [batchId, processedFiles, failedFiles, status],
  );
  return result.rows[0];
}

async function findBatchById(batchId) {
  const result = await pool.query(
    `SELECT * FROM upload_batches WHERE batch_id = $1`,
    [batchId],
  );
  return result.rows[0];
}

// ---- Draft cleanup ----
// Deletes unconfirmed drafts older than the given age (default 24h) —
// covers users who upload a screenshot then never return to Review.
// Caller (a scheduled job) is responsible for also deleting the
// associated storage object for each returned image_url before/after
// calling this, same as deleteReceipt + deleteReceiptScreenshot.
async function findStaleDrafts(olderThanHours = 24) {
  const result = await pool.query(
    `SELECT receipt_id, image_url FROM receipts
     WHERE upload_status = 'draft'
       AND created_at < NOW() - ($1 || ' hours')::interval`,
    [olderThanHours],
  );
  return result.rows;
}

async function deleteStaleDrafts(olderThanHours = 24) {
  const result = await pool.query(
    `DELETE FROM receipts
     WHERE upload_status = 'draft'
       AND created_at < NOW() - ($1 || ' hours')::interval
     RETURNING receipt_id`,
    [olderThanHours],
  );
  return result.rows;
}
// ---- Export header info ----
// Pulls the business's display name plus the owner's name/email, for
// printing at the top of an export (PDF header block, Excel title rows,
// CSV comment lines). There's no owner_id/owner_user_id column on
// businesses itself — "owner" only exists as a role row in
// business_users — so this has to join through that table and filter
// role = 'owner'. LEFT JOIN (not INNER) so the business's own name/type
// still comes back even in the edge case where no owner row exists yet
// (e.g. ownership transferred and the join is mid-flight) — the export
// just prints "Unknown" for the owner fields in that case rather than
// silently returning nothing for the whole business.
async function getBusinessWithOwner(businessId) {
  const result = await pool.query(
    `SELECT
       b.business_id, b.name AS business_name, b.type AS business_type,
       b.address AS business_address, b.phone AS business_phone,
       u.name AS owner_name, u.email AS owner_email
     FROM businesses b
     LEFT JOIN business_users bu
       ON bu.business_id = b.business_id AND bu.role = 'owner'
     LEFT JOIN users u ON u.user_id = bu.user_id
     WHERE b.business_id = $1
     LIMIT 1`,
    [businessId],
  );
  return result.rows[0];
}

async function getReceiptsForExport(businessId, filters = {}) {
  const {
    customer,
    bank,
    reference,
    employee,
    verificationStatus,
    duplicateStatus,
    minAmount,
    maxAmount,
    dateFrom,
    dateTo,
    uploadDateFrom,
    uploadDateTo,
  } = filters;

  const conditions = ["r.business_id = $1", "r.upload_status = 'confirmed'"];
  const values = [businessId];

  function addCondition(sqlWithPlaceholder, value) {
    values.push(value);
    conditions.push(sqlWithPlaceholder.replace("?", `$${values.length}`));
  }

  if (customer) addCondition("r.sender_name ILIKE ?", `%${customer}%`);
  if (bank) addCondition("r.sender_bank ILIKE ?", `%${bank}%`);
  if (reference)
    addCondition("r.transaction_reference ILIKE ?", `%${reference}%`);
  if (employee) addCondition("u.name ILIKE ?", `%${employee}%`);
  if (verificationStatus)
    addCondition("r.verification_status = ?", verificationStatus);
  if (duplicateStatus) addCondition("r.duplicate_status = ?", duplicateStatus);
  if (minAmount !== undefined && minAmount !== null)
    addCondition("r.amount >= ?", minAmount);
  if (maxAmount !== undefined && maxAmount !== null)
    addCondition("r.amount <= ?", maxAmount);
  if (dateFrom) addCondition("r.receipt_date >= ?", dateFrom);
  if (dateTo) addCondition("r.receipt_date <= ?", dateTo);
  if (uploadDateFrom) addCondition("r.created_at >= ?", uploadDateFrom);
  if (uploadDateTo) addCondition("r.created_at <= ?", uploadDateTo);

  const result = await pool.query(
    `SELECT
       r.receipt_id, r.business_id, r.uploaded_by, u.name AS employee_name,
       r.amount, r.currency, r.receipt_date, r.notes, r.image_url,
       r.sender_name, r.sender_bank, r.receiver_name, r.receiver_bank,
       r.transaction_reference, r.screenshot_hash, r.verification_status,
       r.duplicate_status, r.upload_status, r.created_at
     FROM receipts r
     LEFT JOIN users u ON u.user_id = r.uploaded_by
     WHERE ${conditions.join(" AND ")}
     ORDER BY r.receipt_date DESC NULLS LAST, r.created_at DESC`,
    values,
  );
  return result.rows;
}

module.exports = {
  createReceipt,
  findReceiptById,
  getReceiptsByBusiness,
  updateReceipt,
  deleteReceipt,
  findPotentialDuplicates,
  searchReceiptsByBusiness,
  countReceiptsByBusiness,
  getTotalSpentByBusiness,
  countAllReceipts,
  getMostUsedBusiness,
  countPendingVerificationByBusiness,
  countFlaggedDuplicatesByBusiness,
  updateOcrResult,
  createBatch,
  updateBatch,
  findBatchById,
  findStaleDrafts,
  deleteStaleDrafts,
  getReceiptsForExport,
  getBusinessWithOwner,
};
