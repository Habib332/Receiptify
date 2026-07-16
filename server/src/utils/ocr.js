const { GoogleGenAI, Type } = require("@google/genai");
const env = require("../config/env");

// Free-tier vision model as of mid-2026 — Pro models require billing
// (see https://ai.google.dev/pricing), Flash/Flash-Lite remain free with
// reduced quotas. Pin an explicit version rather than an alias so
// behavior doesn't shift under us if Google updates the "latest" pointer.
const MODEL = "gemini-2.5-flash";

const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

// Structured output schema — mirrors the receipts table's sender_name/
// sender_bank/receiver_name/receiver_bank split (previously a single
// bankName field, before the schema separated sender and receiver sides
// of the transaction). Gemini returns exactly these fields, typed,
// instead of us parsing free text with brittle patterns. Any field it
// can't find comes back null rather than guessed.
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
    senderName: {
      type: Type.STRING,
      nullable: true,
      description:
        "Name of the person or account who sent/paid the money (the payer). Null if not visible.",
    },
    senderBank: {
      type: Type.STRING,
      nullable: true,
      description:
        "Bank or payment provider the money was sent FROM (e.g. HBL, UBL, JazzCash, EasyPaisa, SadaPay). Null if not identifiable.",
    },
    receiverName: {
      type: Type.STRING,
      nullable: true,
      description:
        "Name of the person, account, or business who received the money (the payee). Null if not visible — many screenshots only show the sender's side clearly.",
    },
    receiverBank: {
      type: Type.STRING,
      nullable: true,
      description:
        "Bank or payment provider the money was sent TO. Null if not identifiable.",
    },
  },
  required: [
    "amount",
    "date",
    "transactionReference",
    "senderName",
    "senderBank",
    "receiverName",
    "receiverBank",
  ],
};

const PROMPT = `You are reading a payment/receipt screenshot (bank transfer confirmation, mobile wallet receipt, or similar). Extract the following fields exactly as they appear:

- amount: the total transaction amount, as a plain number (no currency symbol, no commas)
- date: the transaction date, converted to YYYY-MM-DD format
- transactionReference: any transaction ID, reference number, or confirmation number shown
- senderName: the name of the person/account who sent the money (the payer)
- senderBank: the bank or payment provider the money was sent FROM
- receiverName: the name of the person/account/business who received the money (the payee)
- receiverBank: the bank or payment provider the money was sent TO

Many screenshots clearly show the sender's details but not the receiver's (or vice versa) — that is normal. If a field is not visible or not present in the image, return null for it — do not guess or fabricate a value. Only extract what is actually shown in the image.`;

/**
 * Downloads the image from a (possibly signed, expiring) URL and sends it
 * to Gemini for structured field extraction. No preprocessing needed,
 * Gemini reads the image directly.
 *
 * @param {string} imageUrl - signed URL for the receipt screenshot
 * @returns {Promise<{
 *   amount: number|null,
 *   date: string|null,
 *   transactionReference: string|null,
 *   senderName: string|null,
 *   senderBank: string|null,
 *   receiverName: string|null,
 *   receiverBank: string|null,
 * }>}
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
    senderName: parsed.senderName || null,
    senderBank: parsed.senderBank || null,
    receiverName: parsed.receiverName || null,
    receiverBank: parsed.receiverBank || null,
  };
}

module.exports = {
  extractReceiptFields,
};
