const { Pool, types } = require("pg");
const env = require("./env");

// PostgreSQL OID 1082 = the DATE type. By default, node-postgres parses
// DATE columns into a JS Date object anchored at UTC midnight — which
// then silently rolls back a day the moment anything reads it using
// LOCAL time methods (.toLocaleDateString(), .getDate(), etc.), for any
// timezone ahead of UTC (e.g. Pakistan, UTC+5). This was the cause of
// receipt_date showing one day earlier than what Gemini correctly
// extracted (e.g. Gemini says "2026-07-12", app displays "2026-07-11").
// Overriding the parser to return the raw "YYYY-MM-DD" string instead
// removes any possibility of that shift — there's no Date object, no
// timezone, nothing to convert. Must run before the Pool is created.
types.setTypeParser(1082, (value) => value);

const pool = new Pool({
  connectionString: env.databaseUrl, // fixed: was env.DATABASE_URL (undefined)
  ssl: { rejectUnauthorized: false }, // added: required for Supabase direct connection
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
  process.exit(1);
});

module.exports = pool;
