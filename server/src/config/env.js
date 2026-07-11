require("dotenv").config();

function required(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const env = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",

  // Google OAuth (Authorization Code flow, backend-driven)
  googleClientId: required("GOOGLE_CLIENT_ID"),
  googleClientSecret: required("GOOGLE_CLIENT_SECRET"),
  // Must exactly match a URI registered in Google Cloud Console
  // e.g. http://localhost:5000/api/auth/google/callback
  googleRedirectUri: required("GOOGLE_REDIRECT_URI"),
  // Where the backend sends the browser after handling Google's callback,
  // e.g. http://localhost:5173/auth/callback
  frontendOAuthCallbackUrl: required("FRONTEND_OAUTH_CALLBACK_URL"),
};

module.exports = env;
