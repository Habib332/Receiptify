const { createClient } = require("@supabase/supabase-js");
const env = require("../config/env");

const supabase = createClient(
  env.supabaseUrl,
  env.supabaseServiceRoleKey, // service role — required for server-side uploads, bypasses RLS
);

const AVATAR_BUCKET = "avatars"; // create this bucket in Supabase Storage dashboard, set to public

/**
 * Downloads a Google profile photo and re-uploads it to Supabase Storage,
 * returning our own permanent public URL.
 *
 * Google's lh3.googleusercontent.com URLs are not stable long-term — the
 * size-suffixed variant (=s96-c) has been observed to fail intermittently
 * even when the bare URL still works, and the underlying token can also
 * rotate/expire. We never store the raw Google URL for this reason.
 *
 * Never throws — a failed mirror should not block login. Returns null on
 * any failure, so callers can just skip updating avatar_url that round.
 */
async function mirrorGoogleAvatar(userId, googleAvatarUrl) {
  if (!googleAvatarUrl) return null;

  try {
    // Strip any existing size suffix and request a fresh, larger one —
    // constructing it ourselves rather than trusting whatever Google sent.
    const baseUrl = googleAvatarUrl.replace(/=s\d+-c$/, "");
    const fetchUrl = `${baseUrl}=s256-c`;

    const res = await fetch(fetchUrl);
    if (!res.ok) {
      console.error(`mirrorGoogleAvatar: fetch failed (${res.status}) for user ${userId}`);
      return null;
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());
    const extension = contentType.includes("png") ? "png" : "jpg";
    const filePath = `${userId}/avatar.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(filePath, buffer, {
        contentType,
        upsert: true, // overwrite each login so the photo stays in sync with Google
      });

    if (uploadError) {
      console.error(`mirrorGoogleAvatar: upload failed for user ${userId}:`, uploadError.message);
      return null;
    }

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);

    // Cache-bust so browsers don't keep serving a stale cached copy after
    // upsert silently overwrites the same path.
    return `${data.publicUrl}?v=${Date.now()}`;
  } catch (err) {
    console.error(`mirrorGoogleAvatar: unexpected error for user ${userId}:`, err);
    return null;
  }
}

module.exports = { mirrorGoogleAvatar };