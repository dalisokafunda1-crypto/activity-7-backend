// scripts/setup-db.js: runs schema.sql and seed.sql against DATABASE_URL.
// Usage: npm run db:setup
// (You can also paste the two .sql files into any SQL client instead.)
require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const pool = require("../db");

async function main() {
  const root = path.join(__dirname, "..");
  for (const file of ["schema.sql", "seed.sql"]) {
    await pool.query(fs.readFileSync(path.join(root, file), "utf8"));
    console.log(`Ran ${file}`);
  }
  const { rows } = await pool.query("SELECT COUNT(*)::int AS total FROM records");
  console.log(`Done. The records table now has ${rows[0].total} record(s).`);
}

main()
  .catch((error) => {
    console.error("Database setup failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
