// ==========================================================
// receipts.export.service.js
// ==========================================================
//
// Sits alongside receipts.service.js. Kept in its own file rather than
// added to receipts.service.js because it pulls in three heavy
// formatting libraries (exceljs, pdfkit, json-2-csv) that have nothing
// to do with the OCR/verification/duplicate business logic already
// living there — no reason to make every other service function pay
// for those imports.
//
// Each exportReceiptsAs* function returns a plain object:
//   { buffer, filename, contentType }
// so the controller layer stays a thin pass-through (matches how the
// rest of your controller/service split already works).

const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const { json2csv } = require("json-2-csv");
const receiptsRepository = require("./receipts.repository");

// Column order + headers shared across CSV, Excel and PDF so the three
// exports are visually/structurally consistent. PRD 5.11 = all fields.
const EXPORT_COLUMNS = [
  { key: "receipt_id", header: "Receipt ID" },
  { key: "receipt_date", header: "Receipt Date" },
  { key: "amount", header: "Amount" },
  { key: "currency", header: "Currency" },
  { key: "sender_name", header: "Sender" },
  { key: "sender_bank", header: "Sender Bank" },
  { key: "receiver_name", header: "Receiver" },
  { key: "receiver_bank", header: "Receiver Bank" },
  { key: "transaction_reference", header: "Reference" },
  { key: "verification_status", header: "Verification Status" },
  { key: "duplicate_status", header: "Duplicate Status" },
  { key: "employee_name", header: "Uploaded By" },
  { key: "notes", header: "Notes" },
  { key: "created_at", header: "Uploaded At" },
];

function buildExportFilename(businessId, extension) {
  const stamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `receipts-export-${businessId}-${stamp}.${extension}`;
}

// Human-readable labels for the filter keys accepted by
// getReceiptsForExport, used to render "Filters applied: ..." in the
// export header. Keeps the mapping in one place rather than repeating
// key -> label logic per format.
const FILTER_LABELS = {
  customer: "Customer",
  bank: "Bank",
  reference: "Reference",
  employee: "Employee",
  verificationStatus: "Verification Status",
  duplicateStatus: "Duplicate Status",
  minAmount: "Min Amount",
  maxAmount: "Max Amount",
  dateFrom: "Date From",
  dateTo: "Date To",
  uploadDateFrom: "Upload Date From",
  uploadDateTo: "Upload Date To",
};

// Builds a short "Customer: Ali, Bank: SadaPay" style string from
// whichever filters were actually passed on the query string. Returns
// null (not empty string) when no filters were applied, so callers can
// decide whether to print a "Filters:" line at all.
function summarizeFilters(filters = {}) {
  const parts = [];
  for (const [key, label] of Object.entries(FILTER_LABELS)) {
    const value = filters[key];
    if (value !== undefined && value !== null && value !== "") {
      parts.push(`${label}: ${value}`);
    }
  }
  return parts.length > 0 ? parts.join("  |  ") : null;
}

// Fetches the business name/owner info used in every export's header
// block. Falls back to safe placeholder text rather than throwing, so a
// missing owner row (edge case — see repository comment) never blocks
// someone from getting their export.
async function fetchExportHeaderInfo(businessId) {
  const business = await receiptsRepository.getBusinessWithOwner(businessId);
  return {
    businessName: business?.business_name || "Unknown Business",
    businessType: business?.business_type || "",
    businessAddress: business?.business_address || "",
    businessPhone: business?.business_phone || "",
    ownerName: business?.owner_name || "Unknown",
    ownerEmail: business?.owner_email || "",
  };
}

// Shared fetch step for all three formats — keeps the filter contract
// (same query params as search) in exactly one place.
async function fetchExportRows(businessId, filters) {
  const rows = await receiptsRepository.getReceiptsForExport(
    businessId,
    filters,
  );
  // Normalize nulls/undefined to empty string up front so every format
  // (CSV, Excel, PDF) renders a blank cell instead of the literal text
  // "null" — json2csv in particular stringifies null as "null" verbatim.
  return rows.map((row) => {
    const clean = {};
    for (const { key } of EXPORT_COLUMNS) {
      const value = row[key];
      clean[key] = value === null || value === undefined ? "" : value;
    }
    return clean;
  });
}

// ---- CSV ----
async function exportReceiptsAsCsv({ businessId, filters }) {
  const [rows, info] = await Promise.all([
    fetchExportRows(businessId, filters),
    fetchExportHeaderInfo(businessId),
  ]);

  // json2csv infers headers from object keys in insertion order, so
  // remapping keys -> header labels here keeps EXPORT_COLUMNS as the
  // single source of truth for column order/labels across all formats.
  const labeledRows = rows.map((row) => {
    const labeled = {};
    for (const { key, header } of EXPORT_COLUMNS) {
      labeled[header] = row[key];
    }
    return labeled;
  });

  const table =
    labeledRows.length > 0
      ? await json2csv(labeledRows)
      : EXPORT_COLUMNS.map((c) => c.header).join(","); // header-only CSV for zero results

  // Leading "#"-prefixed lines: most spreadsheet apps (Excel, Sheets,
  // LibreOffice) either ignore or happily display these as plain text
  // rows above the real header row, so this stays valid CSV either way.
  const filterSummary = summarizeFilters(filters);
  const headerLines = [
    `# Receipts Report - ${info.businessName}`,
    `# Owner: ${info.ownerName}${info.ownerEmail ? ` (${info.ownerEmail})` : ""}`,
    `# Generated: ${new Date().toISOString()}`,
    filterSummary ? `# Filters: ${filterSummary}` : `# Filters: none`,
    "",
  ].join("\n");

  const csv = headerLines + table;

  return {
    buffer: Buffer.from(csv, "utf-8"),
    filename: buildExportFilename(businessId, "csv"),
    contentType: "text/csv",
  };
}

// ---- Excel ----
async function exportReceiptsAsExcel({ businessId, filters }) {
  const [rows, info] = await Promise.all([
    fetchExportRows(businessId, filters),
    fetchExportHeaderInfo(businessId),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Receiptify";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Receipts");
  const colCount = EXPORT_COLUMNS.length;

  // Set column widths/keys up front (this alone does NOT create a
  // header row — that only happens if rows are added via keyed objects
  // matching these keys before an explicit header row is written, which
  // we avoid by adding all rows, including the header, via addRow with
  // plain arrays below).
  sheet.columns = EXPORT_COLUMNS.map(({ key, header }) => ({
    key,
    width: Math.max(header.length + 4, 14),
  }));

  // Banner block: business name / owner / generated date / filters,
  // each merged across all columns so it reads as a title block rather
  // than sitting in column A only.
  const filterSummary = summarizeFilters(filters);
  const bannerLines = [
    `Receipts Report - ${info.businessName}`,
    `Owner: ${info.ownerName}${info.ownerEmail ? ` (${info.ownerEmail})` : ""}`,
    `Generated: ${new Date().toLocaleString()}`,
    `Filters: ${filterSummary || "none"}`,
  ];

  bannerLines.forEach((line, i) => {
    const row = sheet.addRow([line]);
    sheet.mergeCells(i + 1, 1, i + 1, colCount);
    row.font = i === 0 ? { bold: true, size: 13 } : { italic: true, size: 10 };
  });
  sheet.addRow([]); // spacer row before the real table

  // Real table header row, written explicitly (plain array, not the
  // addRow(row)-with-keys form) so it lands as its own row rather than
  // being auto-inserted at row 1 by ExcelJS.
  const tableHeaderRow = sheet.addRow(EXPORT_COLUMNS.map((c) => c.header));
  tableHeaderRow.font = { bold: true };

  rows.forEach((row) => {
    sheet.addRow(EXPORT_COLUMNS.map((c) => row[c.key]));
  });

  // Format amount column as currency-style with 2 decimals
  const amountColIndex =
    EXPORT_COLUMNS.findIndex((c) => c.key === "amount") + 1;
  if (amountColIndex > 0) {
    sheet.getColumn(amountColIndex).numFmt = "#,##0.00";
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return {
    buffer,
    filename: buildExportFilename(businessId, "xlsx"),
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}

// ---- PDF ----
// Simple tabular report (no business logo/branding — deliberately
// scratched, per project decision). Landscape A4 since there are 14
// columns; still needs manual column-width layout since pdfkit has no
// built-in table primitive.
async function exportReceiptsAsPdf({ businessId, filters }) {
  const [rows, info] = await Promise.all([
    fetchExportRows(businessId, filters),
    fetchExportHeaderInfo(businessId),
  ]);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 30,
      size: "A4",
      layout: "landscape",
    });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      resolve({
        buffer: Buffer.concat(chunks),
        filename: buildExportFilename(businessId, "pdf"),
        contentType: "application/pdf",
      });
    });
    doc.on("error", reject);

    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // Give the wider text columns (notes, sender/receiver names) more
    // room than short ones (id, currency, status codes).
    const relativeWidths = {
      receipt_id: 0.5,
      receipt_date: 0.8,
      amount: 0.7,
      currency: 0.5,
      sender_name: 1.1,
      sender_bank: 0.9,
      receiver_name: 1.1,
      receiver_bank: 0.9,
      transaction_reference: 1.1,
      verification_status: 0.9,
      duplicate_status: 0.9,
      employee_name: 0.9,
      notes: 1.3,
      created_at: 1.0,
    };
    const totalRelative = EXPORT_COLUMNS.reduce(
      (sum, c) => sum + relativeWidths[c.key],
      0,
    );
    // Small gutter between columns so adjacent cells never visually
    // touch even when both are near-full-width — this alone doesn't fix
    // overlap (that's the clipping below) but keeps things readable.
    const gutter = 4;
    const colWidths = EXPORT_COLUMNS.map(
      (c) =>
        (relativeWidths[c.key] / totalRelative) * pageWidth -
        (gutter * (EXPORT_COLUMNS.length - 1)) / EXPORT_COLUMNS.length,
    );

    const rowHeight = 16;
    const fontSize = 7;
    doc.fontSize(fontSize);

    // THE ACTUAL FIX for the jumbled/overlapping output: pdfkit's
    // doc.text() wraps onto additional lines by default when text is
    // longer than `width` allows, even with a `height` option set — it
    // does NOT clip. A wrapped second line then renders directly under
    // the first, inside the next row's vertical space, which is what
    // produced the bleed-together look. Setting `lineBreak: false`
    // forces single-line rendering (paired with `ellipsis: true` so
    // overflow text is truncated with "…" instead of spilling past the
    // column width) and `height: rowHeight - 4` keeps a hard clip box so
    // nothing can paint outside its own row.
    function drawRow(values, y, { bold = false } = {}) {
      let x = doc.page.margins.left;
      doc.font(bold ? "Helvetica-Bold" : "Helvetica");
      values.forEach((value, i) => {
        doc.text(String(value ?? ""), x, y, {
          width: colWidths[i],
          height: rowHeight - 4,
          ellipsis: true,
          lineBreak: false,
        });
        x += colWidths[i] + gutter;
      });
    }

    function drawHeader(y) {
      drawRow(
        EXPORT_COLUMNS.map((c) => c.header),
        y,
        { bold: true },
      );
      doc
        .moveTo(doc.page.margins.left, y + rowHeight - 2)
        .lineTo(doc.page.width - doc.page.margins.right, y + rowHeight - 2)
        .stroke();
    }

    // ---- Report header block: business name, owner, generated date,
    // filters applied ----
    doc.fontSize(14).font("Helvetica-Bold").text("Receipts Report", {
      align: "center",
    });
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica-Bold").text(info.businessName, {
      align: "center",
    });
    doc.fontSize(8).font("Helvetica");
    const contactBits = [info.businessAddress, info.businessPhone].filter(
      Boolean,
    );
    if (contactBits.length > 0) {
      doc.text(contactBits.join("  •  "), { align: "center" });
    }
    doc.moveDown(0.4);

    const filterSummary = summarizeFilters(filters);
    doc.fontSize(8).font("Helvetica");
    doc.text(
      `Owner: ${info.ownerName}${info.ownerEmail ? ` (${info.ownerEmail})` : ""}`,
    );
    doc.text(`Generated: ${new Date().toLocaleString()}`);
    doc.text(`Filters: ${filterSummary || "none"}`);
    doc.moveDown(0.6);

    doc.fontSize(fontSize);

    let y = doc.y;
    drawHeader(y);
    y += rowHeight;

    const pageBottom = doc.page.height - doc.page.margins.bottom;

    if (rows.length === 0) {
      doc
        .font("Helvetica")
        .text(
          "No receipts match the selected filters.",
          doc.page.margins.left,
          y + 10,
        );
    }

    for (const row of rows) {
      if (y + rowHeight > pageBottom) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeader(y);
        y += rowHeight;
      }
      drawRow(
        EXPORT_COLUMNS.map((c) => row[c.key]),
        y,
      );
      y += rowHeight;
    }

    doc.end();
  });
}

module.exports = {
  exportReceiptsAsCsv,
  exportReceiptsAsExcel,
  exportReceiptsAsPdf,
};
