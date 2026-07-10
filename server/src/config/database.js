const { Pool } = require("pg");
const env = require("./env");

const pool = new Pool({
  connectionString: env.databaseUrl, // fixed: was env.DATABASE_URL (undefined)
  ssl: { rejectUnauthorized: false }, // added: required for Supabase direct connection
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
  process.exit(1);
});

module.exports = pool;
