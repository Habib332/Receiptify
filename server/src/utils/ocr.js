const { GoogleGenAI, Type } = require("@google/genai");
const env = require("../config/env");

// Free-tier vision model as of mid-2026 — Pro models require billing
// (see https://ai.google.dev/pricing), Flash/Flash-Lite remain free with
// reduced quotas. Pin an explicit version rather than an alias so
// behavior doesn't shift under us if Google updates the "latest" pointer.
const MODEL = "gemini-2.5-flash";

const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

// Structured output schema — replaces the old regex extractors entirely.
// Gemini returns exactly these fields, typed, instead of us parsing free
// text with brittle patterns. Any field it can't find comes back null
// rather than guessed, matching the old parseReceiptFields contract.
const receiptSchema = {
  type: Type.OBJECT,
  properties: {
    amount: {
      type: Type.NUMBER,
      nullable: true,
      description:
        "The total transaction amount as a plain number, no currency symbols or commas. Null if not visible.",
    },
    date: {
      type: Type.STRING,
      nullable: true,
      description:
        "The transaction/payment date in ISO 8601 format (YYYY-MM-DD). Null if not visible.",
    },
    transactionReference: {
      type: Type.STRING,
      nullable: true,
      description:
        "Transaction ID, reference number, or confirmation number. Null if not visible.",
    },
    bankName: {
      type: Type.STRING,
      nullable: true,
      description:
        "Name of the bank or payment provider (e.g. HBL, UBL, JazzCash, EasyPaisa, SadaPay). Null if not identifiable.",
    },
  },
  required: ["amount", "date", "transactionReference", "bankName"],
};

const PROMPT = `You are reading a payment/receipt screenshot (bank transfer confirmation, mobile wallet receipt, or similar). Extract the following fields exactly as they appear:

- amount: the total transaction amount, as a plain number (no currency symbol, no commas)
- date: the transaction date, converted to YYYY-MM-DD format
- transactionReference: any transaction ID, reference number, or confirmation number shown
- bankName: the bank or payment provider name, if identifiable

If a field is not visible or not present in the image, return null for it — do not guess or fabricate a value. Only extract what is actually shown in the image.`;

/**
 * Downloads the image from a (possibly signed, expiring) URL and sends it
 * to Gemini for structured field extraction. Replaces the old Tesseract
 * OCR + regex pipeline — no preprocessing needed, Gemini reads the image
 * directly.
 *
 * @param {string} imageUrl - signed URL for the receipt screenshot
 * @returns {Promise<{amount: number|null, date: string|null, transactionReference: string|null, bankName: string|null}>}
 */
async function extractReceiptFields(imageUrl) {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(
      `Failed to download image for OCR: ${imageResponse.status}`,
    );
  }
  const arrayBuffer = await imageResponse.arrayBuffer();
  const base64Image = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = imageResponse.headers.get("content-type") || "image/png";

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      },
      { text: PROMPT },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: receiptSchema,
    },
  });

  const parsed = JSON.parse(response.text);

  return {
    amount: typeof parsed.amount === "number" ? parsed.amount : null,
    date: parsed.date || null,
    transactionReference: parsed.transactionReference || null,
    bankName: parsed.bankName || null,
  };
}

module.exports = {
  extractReceiptFields,
};