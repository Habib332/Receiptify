const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");
const env = require("../config/env");

const BUCKET_NAME = "receipt-screenshots";
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const DEFAULT_SIGNED_URL_EXPIRY_SECONDS = 60 * 60; // 1 hour

// service_role key bypasses Row Level Security — this client must only
// ever be used server-side (never exposed to the frontend/browser).
const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);

/**
 * Uploads a receipt screenshot buffer to a PRIVATE Supabase Storage bucket
 * and returns the file's storage PATH — not a URL. Unlike business logos
 * (public bucket, permanent public URL), receipt screenshots can contain
 * bank transfer details, so this bucket must be configured as private in
 * the Supabase dashboard. Viewing an image later requires generating a
 * short-lived signed URL via getSignedReceiptUrl() below — never a
 * permanent public link.
 *
 * @param {Buffer} fileBuffer - raw file bytes (from multer's req.file.buffer)
 * @param {string} originalName - original filename, used only for extension
 * @param {string} mimeType
 * @param {number} businessId - used to namespace the file path
 * @returns {Promise<string>} the storage path (e.g. "42/173-abc.png"), to be saved in the database
 */
async function uploadReceiptScreenshot({
  fileBuffer,
  originalName,
  mimeType,
  businessId,
}) {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(
      `Unsupported file type: ${mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`,
    );
  }

  if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error("File too large. Max size is 5MB.");
  }

  const extension = originalName.split(".").pop();
  // Random suffix avoids overwriting a previous screenshot if the same
  // filename is reused, and avoids any risk of guessable/collidable paths.
  const uniqueSuffix = crypto.randomBytes(8).toString("hex");
  const filePath = `${businessId}/${Date.now()}-${uniqueSuffix}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Supabase upload failed: ${uploadError.message}`);
  }

  // No getPublicUrl() call here on purpose — this bucket is private, so a
  // "public" URL wouldn't actually be viewable anyway. The path itself is
  // what gets stored in receipts.image_url; a real viewable link is only
  // ever generated on demand, right before it's needed, by the function below.
  return filePath;
}

/**
 * Generates a short-lived, signed URL for a previously-uploaded receipt
 * screenshot. Call this fresh every time a receipt image actually needs
 * to be displayed — never store the result, since it expires and would
 * go stale sitting in a database column.
 *
 * @param {string} filePath - the storage path returned by uploadReceiptScreenshot
 * @param {number} expiresInSeconds - how long the URL stays valid (default 1 hour)
 * @returns {Promise<string>} a temporary signed URL
 */
async function getSignedReceiptUrl(
  filePath,
  expiresInSeconds = DEFAULT_SIGNED_URL_EXPIRY_SECONDS,
) {
  if (!filePath) {
    throw new Error("No file path provided for signed URL generation");
  }

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, expiresInSeconds);

  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Deletes a receipt screenshot from storage. Called when a receipt row
 * itself is deleted, so orphaned files don't accumulate in the bucket.
 *
 * @param {string} filePath
 */
async function deleteReceiptScreenshot(filePath) {
  if (!filePath) return;

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);

  if (error) {
    // Not re-thrown as fatal — a failed storage cleanup shouldn't block
    // the receipt row from being deleted, since the row is the source of
    // truth. Surface this as a warning for now; revisit if orphaned files
    // become a real problem worth a retry/cleanup job.
    console.error(
      `Failed to delete receipt screenshot ${filePath}:`,
      error.message,
    );
  }
}

module.exports = {
  uploadReceiptScreenshot,
  getSignedReceiptUrl,
  deleteReceiptScreenshot,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
};
