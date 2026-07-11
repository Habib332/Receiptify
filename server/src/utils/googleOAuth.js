const { OAuth2Client } = require("google-auth-library");
const crypto = require("crypto");
const env = require("../config/env");

const client = new OAuth2Client(
  env.googleClientId,
  env.googleClientSecret,
  env.googleRedirectUri,
);

// Scopes: minimal — just identity, no Gmail/Drive/etc access.
const SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

/**
 * Builds the URL to redirect the user to for Google's consent screen.
 * `state` is a CSRF token — generate one per request, store it (e.g. in a
 * short-lived signed cookie) and verify it matches on callback.
 */
function getAuthUrl(state) {
  return client.generateAuthUrl({
    access_type: "offline", // not currently using refresh tokens, but harmless to request
    scope: SCOPES,
    state,
    prompt: "select_account",
  });
}

function generateState() {
  return crypto.randomBytes(24).toString("hex");
}

/**
 * Exchanges an authorization `code` for tokens, then verifies the ID token's
 * signature/audience/issuer against Google's public keys. Returns the
 * verified payload — never trust the code exchange response on its own.
 */
async function verifyAndGetProfile(code) {
  const { tokens } = await client.getToken(code);

  if (!tokens.id_token) {
    throw new Error("Google did not return an id_token");
  }

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.googleClientId,
  });

  const payload = ticket.getPayload();

  if (!payload.email_verified) {
    throw new Error("Google account email is not verified");
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name || payload.email.split("@")[0],
    avatarUrl: payload.picture || null,
  };
}

module.exports = { getAuthUrl, generateState, verifyAndGetProfile };
