const { createWorker } = require("tesseract.js");

// A single shared worker would be faster (avoids re-initializing the
// Tesseract engine on every receipt), but a fresh worker per call is
// simpler and safer for a background job that could run concurrently for
// multiple receipts — no shared-state bugs, no need to manage a pool yet.
// Revisit if OCR volume becomes high enough that startup cost matters.
async function runTesseractOnImageUrl(imageUrl) {
  const worker = await createWorker("eng");

  try {
    const {
      data: { text, confidence },
    } = await worker.recognize(imageUrl);

    return { rawText: text, confidence }; // confidence is 0-100
  } finally {
    // Always terminate, even if recognize() throws, so a failed OCR run
    // doesn't leak the worker's WASM instance.
    await worker.terminate();
  }
}

// ---- Field extraction heuristics ----
// Raw OCR text from real payment screenshots (bank apps, wallet
// confirmations, WhatsApp forwards) has no fixed layout, so these are
// best-effort regex patterns, not a guarantee. Each one is intentionally
// isolated so it can be tuned independently once real screenshots reveal
// what patterns actually show up — nothing here is final.

function extractAmount(text) {
  // Matches: "Rs 5,000", "Rs. 5000.00", "PKR 12,500", "Amount: 3,200"
  const match = text.match(
    /(?:rs\.?|pkr|amount)\s*[:.]?\s*([\d,]+(?:\.\d{1,2})?)/i,
  );
  if (!match) return null;
  const numeric = match[1].replace(/,/g, "");
  const parsed = parseFloat(numeric);
  return isNaN(parsed) ? null : parsed;
}

function extractTransactionReference(text) {
  // Matches: "TXN ID: 84921730", "Transaction ID 993827", "Ref# ABC123XY",
  // "Reference No: 1234567890"
  const match = text.match(
    /(?:txn\.?\s*id|transaction\s*id|ref(?:erence)?\.?\s*(?:no\.?)?)\s*[:#]?\s*([A-Za-z0-9]{4,})/i,
  );
  return match ? match[1] : null;
}

function extractBankName(text) {
  // Small known-bank list is more reliable than trying to generically
  // detect "a bank name" from arbitrary text. Extend this list as real
  // screenshots come in from your actual users' banks/wallets.
  const knownBanks = [
    "HBL",
    "UBL",
    "MCB",
    "Meezan",
    "Allied Bank",
    "Bank Alfalah",
    "Faysal Bank",
    "JazzCash",
    "EasyPaisa",
    "SadaPay",
    "NayaPay",
  ];

  const found = knownBanks.find((bank) => new RegExp(bank, "i").test(text));
  return found || null;
}

function extractDate(text) {
  // Matches common formats: 12/07/2026, 12-07-2026, 2026-07-12
  const match = text.match(
    /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/,
  );
  return match ? match[1] : null;
}

// Runs all extractors against one block of OCR text. Returns null for any
// field it couldn't confidently find — caller decides what to do with
// nulls (e.g. leave the manual-entry fields as the user originally typed
// them, only use OCR to fill in what's missing).
function parseReceiptFields(rawText) {
  return {
    amount: extractAmount(rawText),
    transactionReference: extractTransactionReference(rawText),
    bankName: extractBankName(rawText),
    date: extractDate(rawText),
  };
}

module.exports = {
  runTesseractOnImageUrl,
  parseReceiptFields,
};
