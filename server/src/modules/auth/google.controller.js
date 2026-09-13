const googleService = require("./google.service");
const env = require("../../config/env");

const STATE_COOKIE = "g_oauth_state";

function getCallbackBaseUrl(state) {
  const platform = state?.startsWith("mobile.") ? "mobile" : "web";
  return platform === "mobile" ? env.mobileOAuthCallbackUrl : env.frontendOAuthCallbackUrl;
}

async function redirectToGoogle(req, res, next) {
  try {
    const platform = req.query.platform === "mobile" ? "mobile" : "web";
    const { url, state } = googleService.buildAuthRedirect(platform);

    res.cookie(STATE_COOKIE, state, {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: "lax",
      maxAge: 5 * 60 * 1000,
    });

    res.redirect(url);
  } catch (err) {
    next(err);
  }
}

async function handleCallback(req, res, next) {
  const expectedState = req.cookies?.[STATE_COOKIE];
  const callbackBaseUrl = getCallbackBaseUrl(expectedState);

  try {
    const { code, state, error: googleError } = req.query;

    res.clearCookie(STATE_COOKIE);

    if (googleError) {
      return res.redirect(`${callbackBaseUrl}?error=${encodeURIComponent(googleError)}`);
    }

    if (!code || !state || state !== expectedState) {
      return res.redirect(`${callbackBaseUrl}?error=invalid_state`);
    }

    const exchangeCode = await googleService.handleCallback(code);

    res.redirect(`${callbackBaseUrl}?code=${exchangeCode}`);
  } catch (err) {
    console.error("Google OAuth callback failed:", err);
    res.redirect(`${callbackBaseUrl}?error=oauth_failed`);
  }
}

async function exchange(req, res, next) {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: "code is required" });
    }

    const result = await googleService.exchangeCode(code);

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { redirectToGoogle, handleCallback, exchange };