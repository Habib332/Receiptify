const authRepository = require("./auth.repository");
const googleOAuth = require("../../utils/googleOAuth");
const { generateIdentityToken } = require("../../utils/jwt");
const ApiError = require("../../utils/apiError");

/*
 * Flow (Authorization Code, backend-driven):
 *
 * 1. GET /api/auth/google            -> buildAuthRedirect()
 *    Browser is redirected to Google's consent screen.
 *
 * 2. Google redirects back to:
 *    GET /api/auth/google/callback?code=...&state=...
 *    -> handleCallback(code)
 *    Backend exchanges the code with Google, verifies the ID token,
 *    finds-or-creates the user, mints an identityToken (same 15m token
 *    used by password login), and stores it behind a one-time exchange
 *    code. The identityToken itself never appears in a URL.
 *
 * 3. Backend redirects the browser to:
 *    {FRONTEND_OAUTH_CALLBACK_URL}?code=<oneTimeCode>
 *
 * 4. Frontend immediately calls:
 *    POST /api/auth/google/exchange { code }
 *    -> exchangeCode(code)
 *    Returns { identityToken } in the response body. From here the
 *    frontend follows the exact same path as password login: call
 *    /api/auth/select-business with the identityToken to get a
 *    full sessionToken.
 */

function buildAuthRedirect() {
  const state = googleOAuth.generateState();
  const url = googleOAuth.getAuthUrl(state);
  return { url, state };
}

async function handleCallback(code) {
  let profile;
  try {
    profile = await googleOAuth.verifyAndGetProfile(code);
  } catch (err) {
    throw new ApiError(401, "Google sign-in failed. Please try again.");
  }

  const { googleId, email, name, avatarUrl } = profile;

  let user = await authRepository.findUserByGoogleId(googleId);

  if (!user) {
    const existingLocalUser = await authRepository.findUserByEmail(email);

    if (existingLocalUser) {
      // Same verified email as an existing local account -> link, don't
      // create a duplicate. Google has already verified this email, so
      // this isn't the "unverified email takeover" anti-pattern.
      user = await authRepository.linkGoogleAccount({
        userId: existingLocalUser.user_id,
        googleId,
        avatarUrl,
      });
    } else {
      user = await authRepository.createGoogleUser({
        name,
        email,
        googleId,
        avatarUrl,
      });
    }
  }

  const identityToken = generateIdentityToken({ userId: user.user_id });

  const exchangeCode = await authRepository.createExchangeCode({
    userId: user.user_id,
    identityToken,
  });

  return exchangeCode;
}

async function exchangeCode(code) {
  const claimed = await authRepository.consumeExchangeCode(code);

  if (!claimed) {
    throw new ApiError(
      400,
      "This sign-in link has expired or already been used",
    );
  }

  return { identityToken: claimed.identity_token };
}

module.exports = { buildAuthRedirect, handleCallback, exchangeCode };
