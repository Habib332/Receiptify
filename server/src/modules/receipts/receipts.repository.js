const pool = require("../../config/database");

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
        sender_name, sender_bank, receiver_bank, transaction_reference, screenshot_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
  const result = await pool.query(
    `SELECT * FROM receipts WHERE receipt_id = $1`,
    [receiptId],
  );
  return result.rows[0];
}

async function getReceiptsByBusiness(businessId) {
  const result = await pool.query(
    `SELECT * FROM receipts WHERE business_id = $1 ORDER BY receipt_date DESC`,
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
         duplicate_status = COALESCE($14, duplicate_status)
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
async function findPotentialDuplicates({
  businessId,
  transactionReference,
  screenshotHash,
  excludeReceiptId = null,
}) {
  const conditions = ["business_id = $1"];
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
    `SELECT COUNT(*)::int AS count FROM receipts WHERE business_id = $1`,
    [businessId],
  );
  return result.rows[0].count;
}

async function getTotalSpentByBusiness(businessId) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM receipts WHERE business_id = $1`,
    [businessId],
  );
  return result.rows[0].total;
}

async function countAllReceipts() {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count FROM receipts`,
  );
  return result.rows[0].count;
}

async function getMostUsedBusiness() {
  const result = await pool.query(
    `SELECT b.business_id, b.name, COUNT(r.receipt_id)::int AS receipt_count
     FROM businesses b
     JOIN receipts r ON r.business_id = b.business_id
     GROUP BY b.business_id, b.name
     ORDER BY receipt_count DESC
     LIMIT 1`,
  );
  return result.rows[0];
}

async function countPendingVerificationByBusiness(businessId) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count FROM receipts
     WHERE business_id = $1 AND verification_status = 'pending'`,
    [businessId],
  );
  return result.rows[0].count;
}

async function countFlaggedDuplicatesByBusiness(businessId) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count FROM receipts
     WHERE business_id = $1 AND duplicate_status = 'flagged'`,
    [businessId],
  );
  return result.rows[0].count;
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

module.exports = {
  createReceipt,
  findReceiptById,
  getReceiptsByBusiness,
  updateReceipt,
  deleteReceipt,
  findPotentialDuplicates,
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
};
