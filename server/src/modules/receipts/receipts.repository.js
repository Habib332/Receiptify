const pool = require("../../config/database");

async function createReceipt({
  businessId,
  uploadedBy,
  vendorName,
  amount,
  currency,
  receiptDate,
  notes,
  imageUrl,
  customerName,
  customerPhone,
  senderName,
  bankName,
  transactionReference,
  screenshotHash,
}) {
  const result = await pool.query(
    `INSERT INTO receipts
       (business_id, uploaded_by, vendor_name, amount, currency, receipt_date, notes, image_url,
        customer_name, customer_phone, sender_name, bank_name, transaction_reference, screenshot_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *`,
    [
      businessId,
      uploadedBy,
      vendorName,
      amount,
      currency,
      receiptDate,
      notes,
      imageUrl,
      customerName,
      customerPhone,
      senderName,
      bankName,
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
    vendorName,
    amount,
    currency,
    receiptDate,
    notes,
    imageUrl,
    customerName,
    customerPhone,
    senderName,
    bankName,
    transactionReference,
    screenshotHash,
    verificationStatus,
    duplicateStatus,
    // ocrConfidence removed – column dropped
  },
) {
  const result = await pool.query(
    `UPDATE receipts
     SET vendor_name = COALESCE($2, vendor_name),
         amount = COALESCE($3, amount),
         currency = COALESCE($4, currency),
         receipt_date = COALESCE($5, receipt_date),
         notes = COALESCE($6, notes),
         image_url = COALESCE($7, image_url),
         customer_name = COALESCE($8, customer_name),
         customer_phone = COALESCE($9, customer_phone),
         sender_name = COALESCE($10, sender_name),
         bank_name = COALESCE($11, bank_name),
         transaction_reference = COALESCE($12, transaction_reference),
         screenshot_hash = COALESCE($13, screenshot_hash),
         verification_status = COALESCE($14, verification_status),
         duplicate_status = COALESCE($15, duplicate_status)
         -- ocr_confidence removed
     WHERE receipt_id = $1
     RETURNING *`,
    [
      receiptId,
      vendorName,
      amount,
      currency,
      receiptDate,
      notes,
      imageUrl,
      customerName,
      customerPhone,
      senderName,
      bankName,
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

// ---- Duplicate detection lookups (PRD 5.6) ----

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

// ---- OCR (only ocr_status now) ----
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

// ---- Search & filters ----
async function searchReceiptsByBusiness(businessId, filters = {}) {
  const {
    vendorName,
    customerName,
    senderName,
    bankName,
    transactionReference,
    minAmount,
    maxAmount,
    fromDate,
    toDate,
    verificationStatus,
    duplicateStatus,
    ocrStatus,
    sortBy = "receipt_date",
    sortOrder = "DESC",
    page = 1,
    limit = 20,
  } = filters;

  const conditions = ["business_id = $1"];
  const values = [businessId];
  let paramIndex = 2;

  if (vendorName) {
    conditions.push(`vendor_name ILIKE $${paramIndex}`);
    values.push(`%${vendorName}%`);
    paramIndex++;
  }
  if (customerName) {
    conditions.push(`customer_name ILIKE $${paramIndex}`);
    values.push(`%${customerName}%`);
    paramIndex++;
  }
  if (senderName) {
    conditions.push(`sender_name ILIKE $${paramIndex}`);
    values.push(`%${senderName}%`);
    paramIndex++;
  }
  if (bankName) {
    conditions.push(`bank_name ILIKE $${paramIndex}`);
    values.push(`%${bankName}%`);
    paramIndex++;
  }
  if (transactionReference) {
    conditions.push(`transaction_reference ILIKE $${paramIndex}`);
    values.push(`%${transactionReference}%`);
    paramIndex++;
  }
  if (minAmount) {
    conditions.push(`amount >= $${paramIndex}`);
    values.push(parseFloat(minAmount));
    paramIndex++;
  }
  if (maxAmount) {
    conditions.push(`amount <= $${paramIndex}`);
    values.push(parseFloat(maxAmount));
    paramIndex++;
  }
  if (fromDate) {
    conditions.push(`receipt_date >= $${paramIndex}`);
    values.push(fromDate);
    paramIndex++;
  }
  if (toDate) {
    conditions.push(`receipt_date <= $${paramIndex}`);
    values.push(toDate);
    paramIndex++;
  }
  if (verificationStatus) {
    conditions.push(`verification_status = $${paramIndex}`);
    values.push(verificationStatus);
    paramIndex++;
  }
  if (duplicateStatus) {
    conditions.push(`duplicate_status = $${paramIndex}`);
    values.push(duplicateStatus);
    paramIndex++;
  }
  if (ocrStatus) {
    conditions.push(`ocr_status = $${paramIndex}`);
    values.push(ocrStatus);
    paramIndex++;
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const orderBy = `ORDER BY ${sortBy} ${sortOrder}`;
  const offset = (page - 1) * limit;
  const limitClause = `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  values.push(limit, offset);

  const query = `
    SELECT *
    FROM receipts
    ${whereClause}
    ${orderBy}
    ${limitClause}
  `;
  const result = await pool.query(query, values);

  const countValues = values.slice(0, values.length - 2);
  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM receipts
    ${whereClause}
  `;
  const countResult = await pool.query(countQuery, countValues);

  return {
    data: result.rows,
    total: countResult.rows[0].total,
    page,
    limit,
  };
}

// ---- Customer history ----
async function getCustomerSummaryByBusiness(businessId, customerName) {
  const result = await pool.query(
    `SELECT 
       COALESCE(customer_name, sender_name) AS customer,
       COUNT(*) AS total_payments,
       COALESCE(SUM(amount), 0) AS total_spent,
       MAX(receipt_date) AS last_payment,
       COALESCE(AVG(amount), 0) AS average_payment
     FROM receipts
     WHERE business_id = $1
       AND (customer_name = $2 OR sender_name = $2)
     GROUP BY customer`,
    [businessId, customerName],
  );
  return result.rows[0] || null;
}

async function listCustomersByBusiness(businessId, searchTerm = "") {
  const result = await pool.query(
    `SELECT DISTINCT COALESCE(customer_name, sender_name) AS customer
     FROM receipts
     WHERE business_id = $1
       AND (customer_name IS NOT NULL OR sender_name IS NOT NULL)
       AND COALESCE(customer_name, sender_name) ILIKE $2
     ORDER BY customer`,
    [businessId, `%${searchTerm}%`],
  );
  return result.rows.map((row) => row.customer);
}

// ─── Batch upload ───────────────────────────────────────────────────
async function createBatch({ businessId, uploadedBy, totalFiles }) {
  const result = await pool.query(
    `INSERT INTO upload_batches (business_id, uploaded_by, total_files)
     VALUES ($1, $2, $3) RETURNING *`,
    [businessId, uploadedBy, totalFiles]
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
    [batchId, processedFiles, failedFiles, status]
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
  searchReceiptsByBusiness,
  getCustomerSummaryByBusiness,
  listCustomersByBusiness,
  createBatch,
  updateBatch
};
