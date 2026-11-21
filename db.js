// db.js: creates ONE PostgreSQL connection pool and exports it.
// Every route file uses this same pool: require("../db").
require("dotenv").config({ quiet: true });
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn("Warning: DATABASE_URL is not set. Add it to your .env file (see .env.example).");
}

// Hosted databases (Render, Neon, ...) need SSL; a database on your own computer does not.
// Override with DATABASE_SSL=true or DATABASE_SSL=false in .env if your host needs it.
const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(connectionString || "");
const sslSetting = (process.env.DATABASE_SSL || "").toLowerCase();
const useSsl = sslSetting === "true" || (sslSetting !== "false" && !isLocal);

const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  max: 5,                         // small pool is enough for a classroom service
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000  // fail with an error instead of hanging forever
});

// An idle connection can drop (for example when the database restarts). Log it; do not crash.
pool.on("error", (error) => {
  console.error("Unexpected database pool error:", error.message);
});

module.exports = pool;
