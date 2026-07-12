const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");
const env = require("../config/env");

const BUCKET_NAME = "business-logos";
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// service_role key bypasses Row Level Security — this client must only
// ever be used server-side (never exposed to the frontend/browser).
const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);

/**
 * Uploads a logo image buffer to Supabase Storage and returns its public URL.
 * @param {Buffer} fileBuffer - raw file bytes (from multer's req.file.buffer)
 * @param {string} originalName - original filename, used only for extension
 * @param {string} mimeType
 * @param {number} businessId - used to namespace the file path
 */
async function uploadBusinessLogo({
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
  // Random suffix avoids overwriting a previous logo if the same filename
  // is reused, and avoids any risk of guessable/collidable paths.
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

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

  return data.publicUrl;
}

module.exports = {
  uploadBusinessLogo,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
};
