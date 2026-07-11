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
}) {
  const result = await pool.query(
    `INSERT INTO receipts
       (business_id, uploaded_by, vendor_name, amount, currency, receipt_date, notes, image_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
  { vendorName, amount, currency, receiptDate, notes, imageUrl },
) {
  const result = await pool.query(
    `UPDATE receipts
     SET vendor_name = COALESCE($2, vendor_name),
         amount = COALESCE($3, amount),
         currency = COALESCE($4, currency),
         receipt_date = COALESCE($5, receipt_date),
         notes = COALESCE($6, notes),
         image_url = COALESCE($7, image_url)
     WHERE receipt_id = $1
     RETURNING *`,
    [receiptId, vendorName, amount, currency, receiptDate, notes, imageUrl],
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

// ---- Stats (feeds business dashboard once this table has real data) ----

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

// "Most used" business = the one with the most receipts, system-wide.
async function getMostUsedBusiness() {
  const result = await pool.query(
    `SELECT b.business_id, b.name, COUNT(r.receipt_id)::int AS receipt_count
     FROM businesses b
     JOIN receipts r ON r.business_id = b.business_id
     GROUP BY b.business_id, b.name
     ORDER BY receipt_count DESC
     LIMIT 1`,
  );
  return result.rows[0]; // undefined if no receipts exist yet anywhere
}

module.exports = {
  createReceipt,
  findReceiptById,
  getReceiptsByBusiness,
  updateReceipt,
  deleteReceipt,
  countReceiptsByBusiness,
  getTotalSpentByBusiness,
  countAllReceipts,
  getMostUsedBusiness,
};
