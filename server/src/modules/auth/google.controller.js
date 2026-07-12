const googleService = require("./google.service");
const env = require("../../config/env");

const STATE_COOKIE = "g_oauth_state";

async function redirectToGoogle(req, res, next) {
  try {
    const { url, state } = googleService.buildAuthRedirect();

    // Short-lived, httpOnly cookie just to survive the round trip to Google
    // and back. Not used for anything beyond CSRF-checking this one flow.
    res.cookie(STATE_COOKIE, state, {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: "lax", // 'lax' (not 'strict') because this cookie must survive Google's cross-site redirect back
      maxAge: 5 * 60 * 1000,
    });

    res.redirect(url);
  } catch (err) {
    next(err);
  }
}

async function handleCallback(req, res, next) {
  try {
    const { code, state, error: googleError } = req.query;
    const expectedState = req.cookies?.[STATE_COOKIE];

    res.clearCookie(STATE_COOKIE);

    if (googleError) {
      // User declined consent, or Google-side error
      return res.redirect(
        `${env.frontendOAuthCallbackUrl}?error=${encodeURIComponent(googleError)}`,
      );
    }

    if (!code || !state || state !== expectedState) {
      return res.redirect(
        `${env.frontendOAuthCallbackUrl}?error=invalid_state`,
      );
    }

    const exchangeCode = await googleService.handleCallback(code);

    res.redirect(`${env.frontendOAuthCallbackUrl}?code=${exchangeCode}`);
  } catch (err) {
    // Don't leak internal errors into a redirect query string; log and
    // send a generic error flag instead.
    console.error("Google OAuth callback failed:", err);
    res.redirect(`${env.frontendOAuthCallbackUrl}?error=oauth_failed`);
  }
}

async function exchange(req, res, next) {
  try {
    const { code } = req.body;

    if (!code) {
      return res
        .status(400)
        .json({ success: false, message: "code is required" });
    }

    const result = await googleService.exchangeCode(code);

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { redirectToGoogle, handleCallback, exchange };
