const fs = require("fs");
const path = require("path");
const pool = require("../config/database");

async function runMigrations() {
  const migrationsDir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(migrationsDir).sort(); // ensures 001, 002... order

  for (const file of files) {
    if (!file.endsWith(".sql")) continue;

    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, "utf-8");

    console.log(`Running migration: ${file}`);
    await pool.query(sql);
    console.log(`✓ ${file} applied`);
  }

  console.log("All migrations applied successfully.");
  await pool.end();
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
