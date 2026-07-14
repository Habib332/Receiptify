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

  googleClientId: required("GOOGLE_CLIENT_ID"),
  googleClientSecret: required("GOOGLE_CLIENT_SECRET"),
  googleRedirectUri: required("GOOGLE_REDIRECT_URI"),
  frontendOAuthCallbackUrl: required("FRONTEND_OAUTH_CALLBACK_URL"),

  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
};

module.exports = {
  ...env,
  geminiApiKey: process.env.GEMINI_API_KEY,
};