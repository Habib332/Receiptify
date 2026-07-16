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

// Kept broad and pattern-based rather than tied to one bank's layout —
// screenshots come from many different banks/wallets (HBL, UBL, Meezan,
// MCB, Faysal, Alfalah, JazzCash, EasyPaisa, SadaPay, NayaPay,
// etc.) and each labels sender/receiver differently. Earlier version of
// this prompt was too generic and the model sometimes only read one
// side of a two-account layout — this version explicitly enumerates the
// label variants and the "two account blocks" layout so it doesn't skip
// the second one.
const PROMPT = `
You are an expert OCR and payment receipt parser.

Your task is to accurately extract structured information from Pakistani bank transfer receipts, mobile wallet receipts, IBFT confirmations, RAAST transfers, internet banking receipts, ATM receipts and payment confirmations.

Return ONLY information that is actually visible in the image.

------------------------
FIELDS
------------------------

Extract:

• amount
• date
• transactionReference
• senderName
• senderBank
• receiverName
• receiverBank

If any field cannot be determined confidently, return null.

Never invent information.

------------------------
AMOUNT
------------------------

Extract ONLY the transferred amount.

Return it as a plain number.

Examples:

Rs. 1,500.00
PKR 1500
1,500

↓

1500

------------------------
DATE
------------------------

Convert every date into

YYYY-MM-DD

Examples:

25 Jun 2026
25-06-2026
06/25/2026

↓

2026-06-25

If no date exists return null.

------------------------
TRANSACTION REFERENCE
------------------------

Look for fields such as

Transaction ID
Reference
Reference Number
RRN
STAN
Confirmation Number
Txn ID
IBFT Reference
RAAST Reference
Trace Number

Return the value exactly.

------------------------
SENDER
------------------------

The sender is the account money came FROM.

Possible labels include:

From
From Account
Sender
Paid By
Debit Account
Debit From
Account Holder

Extract ONLY the person's/business's name.

Never extract account numbers.

------------------------
RECEIVER
------------------------

The receiver is the account money went TO.

Possible labels include:

To
To Account
Receiver
Beneficiary
Recipient
Paid To
Credit Account

Extract ONLY the person's/business's name.

Never extract account numbers.

------------------------
BANK IDENTIFICATION
------------------------

This is extremely important.

A bank/provider may appear in ANY of these ways:

• full text
• partial text
• logo
• app branding
• header
• footer
• account card
• colored icon
• watermark
• navigation bar

Use ALL visual evidence together.

For example:

green HBL logo
red UBL swirl
green Meezan emblem
blue MCB logo
red Bank Alfalah logo
yellow EasyPaisa branding
black SadaPay branding
purple NayaPay branding
red JazzCash branding

Even if the bank name is not written completely, identify it using:

• logo
• icon
• brand colors
• typography
• partial letters
• application interface

Common institutions include:

HBL
UBL
Meezan Bank
MCB Bank
Bank Alfalah
Allied Bank
Askari Bank
Bank Al Habib
Faysal Bank
JS Bank
Soneri Bank
Standard Chartered
NBP
EasyPaisa
JazzCash
SadaPay
NayaPay
Konnect
RAAST

If BOTH accounts belong to different banks,
identify BOTH separately.

Example:

Sender:
Meezan Bank

Receiver:
HBL

Do NOT copy the same bank into both fields unless the image clearly indicates that both accounts belong to the same institution.

------------------------
MULTIPLE ACCOUNT BLOCKS
------------------------

Many receipts contain TWO account sections.

Always inspect the ENTIRE image.

Do not stop after finding the first account.

Read every visible account card before returning.

------------------------
IGNORE
------------------------

Ignore:

watermarks

background patterns

advertisements

blurred decorations

UI elements

status bar

battery

network icons

notification icons

------------------------
CONFIDENCE
------------------------

Only return a bank if you are confident.

If uncertain,

return null.

Do not guess.

Return valid JSON only.
`;

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
      // Deterministic, literal extraction — this is a reading task, not
      // a creative one. Lower temperature reduces the odds of the model
      // paraphrasing/guessing a name or bank instead of reporting what's
      // actually on screen (or returning null when unsure).
      temperature: 0,
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