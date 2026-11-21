// server.js: creates the Express app, middleware, API guide page, health route and error handlers.
require("dotenv").config({ quiet: true });
const express = require("express");
const cors = require("cors");
const pool = require("./db");

const PROJECT_NAME = process.env.PROJECT_NAME || "Campus Maintenance Requests";
const STUDENT_NUMBER = process.env.STUDENT_NUMBER || "YOUR-STUDENT-NUMBER";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1); // hosts such as Render sit behind a proxy; this keeps https in generated links

// Browser origins allowed to call the API (comma separated list in .env)
const origins = (process.env.CLIENT_ORIGINS || "")
  .split(",").map((value) => value.trim()).filter(Boolean);
app.use(cors({ origin: origins }));
app.use(express.json({ limit: "10kb" }));

/* ---------- GET / : API guide for the marker ---------- */

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function guidePage(baseUrl) {
  const base = escapeHtml(baseUrl);
  const routes = [
    ["GET", "/", "Show this API guide.", "200"],
    ["GET", "/health", "Check that the server and database respond.", "200 (503 if the database fails)"],
    ["GET", "/api/records", "Read all records.", "200"],
    ["GET", "/api/records/:id", "Read one record.", "200"],
    ["POST", "/api/records", "Create a record.", "201"],
    ["PUT", "/api/records/:id", "Update a record (all four fields).", "200"],
    ["DELETE", "/api/records/:id", "Delete a record.", "200"]
  ].map(([m, p, d, s]) =>
    `<tr><td><span class="m ${m.toLowerCase()}">${m}</span></td><td><code>${p}</code></td><td>${d}</td><td>${s}</td></tr>`
  ).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(PROJECT_NAME)} API</title>
<style>
  :root { --ink:#1b1f1d; --muted:#556; --line:#d6dad8; --blue:#1456a0; --bg:#f2f5f4; --dark:#16231e; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: "Segoe UI", system-ui, Arial, sans-serif; background:var(--bg); color:var(--ink); line-height:1.55; }
  header { background:var(--dark); color:#fff; padding:1.25rem 1rem; border-bottom:5px solid var(--blue); }
  header h1 { margin:0; font-size:1.6rem; }
  header p { margin:.25rem 0 0; color:#c8d4db; }
  main { max-width: 60rem; margin:0 auto; padding:1rem; }
  section { background:#fff; border:1px solid var(--line); border-radius:8px; padding:1rem 1.25rem; margin:1rem 0; }
  h2 { font-size:1.2rem; margin:0 0 .6rem; }
  table { border-collapse:collapse; width:100%; }
  th, td { text-align:left; padding:.45rem .6rem; border-bottom:1px solid var(--line); vertical-align:top; }
  th { background:#eef2f1; }
  .wrap { overflow-x:auto; }
  code, pre { font-family: Consolas, "Courier New", monospace; font-size:.92rem; }
  pre { background:#101c17; color:#e6f1ec; padding:.8rem 1rem; border-radius:6px; overflow-x:auto; margin:.4rem 0 .8rem; }
  code { background:#eef2f1; padding:.05rem .3rem; border-radius:4px; }
  pre code { background:none; padding:0; }
  .m { display:inline-block; min-width:4.2rem; text-align:center; color:#fff; font-weight:700; font-size:.8rem; padding:.1rem .4rem; border-radius:4px; }
  .get { background:#1d6b3a; } .post { background:var(--blue); } .put { background:#7a5a00; } .delete { background:#a4262c; }
  a { color:var(--blue); }
  .note { border-left:5px solid var(--blue); background:#eaf2fb; padding:.6rem .9rem; border-radius:4px; }
</style>
</head>
<body>
<header>
  <h1>${escapeHtml(PROJECT_NAME)} API</h1>
  <p>ICT251 Introduction to Web Technologies &middot; Activity 7 Backend Development &middot; Mulungushi University</p>
</header>
<main>
  <section>
    <h2>Project</h2>
    <p><strong>Project name:</strong> ${escapeHtml(PROJECT_NAME)}<br>
       <strong>Student number:</strong> ${escapeHtml(STUDENT_NUMBER)}</p>
    <p>This backend stores campus maintenance requests (broken lights, taps and furniture) in a PostgreSQL database
       and lets any client read, create, update and delete them as JSON. All records are made up.</p>
  </section>

  <section>
    <h2>Live API base URL</h2>
    <p><code>${base}</code></p>
    <p>Try the read routes: <a href="/health">/health</a> &middot; <a href="/api/records">/api/records</a></p>
    <p class="note">If the service has been idle it may need up to a minute to start. The first request can be slow; try again if it times out.</p>
  </section>

  <section>
    <h2>Routes</h2>
    <div class="wrap"><table>
      <thead><tr><th>Method</th><th>Route</th><th>Purpose</th><th>Success status</th></tr></thead>
      <tbody>
${routes}
      </tbody>
    </table></div>
  </section>

  <section>
    <h2>Record fields</h2>
    <div class="wrap"><table>
      <thead><tr><th>Field</th><th>Rule</th></tr></thead>
      <tbody>
        <tr><td><code>id</code></td><td>Positive whole number. Generated by the database. Returned in responses; never sent by the client (ignored if sent).</td></tr>
        <tr><td><code>title</code></td><td>Text, 3 to 80 characters (spaces at the ends are trimmed first).</td></tr>
        <tr><td><code>category</code></td><td>Text, 2 to 40 characters.</td></tr>
        <tr><td><code>description</code></td><td>Text, 5 to 300 characters.</td></tr>
        <tr><td><code>status</code></td><td>Exactly one of: <code>Pending</code>, <code>In progress</code>, <code>Completed</code>.</td></tr>
      </tbody>
    </table></div>
    <h2>Valid POST and PUT body</h2>
    <p>Send all four fields with <code>Content-Type: application/json</code>. Do not send <code>id</code>. PUT replaces all four fields and never creates a missing record.</p>
<pre><code>{
  "title": "Broken classroom light",
  "category": "Electrical",
  "description": "The light in Room B12 does not switch on.",
  "status": "Pending"
}</code></pre>
    <h2>Example requests (curl)</h2>
<pre><code>curl ${base}/api/records
curl -X POST ${base}/api/records -H "Content-Type: application/json" \\
  -d '{"title":"Broken classroom light","category":"Electrical","description":"The light in Room B12 does not switch on.","status":"Pending"}'
curl -X PUT ${base}/api/records/1 -H "Content-Type: application/json" \\
  -d '{"title":"Broken classroom light","category":"Electrical","description":"Light fixed in Room B12.","status":"Completed"}'
curl -X DELETE ${base}/api/records/1</code></pre>
  </section>

  <section>
    <h2>Status codes</h2>
    <div class="wrap"><table>
      <thead><tr><th>Code</th><th>Meaning</th></tr></thead>
      <tbody>
        <tr><td>200</td><td>Success: GET all (an array, or <code>[]</code>), GET one, PUT (updated record), DELETE (<code>{"message":"Record deleted."}</code>), /health.</td></tr>
        <tr><td>201</td><td>POST created the record and returned it with its new id.</td></tr>
        <tr><td>400</td><td>Invalid input: missing or spaces-only value, wrong length, unknown status, invalid id, or malformed JSON.</td></tr>
        <tr><td>404</td><td>The record (or route) does not exist.</td></tr>
        <tr><td>500</td><td>Unexpected server failure.</td></tr>
        <tr><td>503</td><td>/health only: the database did not respond.</td></tr>
      </tbody>
    </table></div>
    <p>Every error is JSON with a <code>message</code> field, for example <code>{"message":"Title must have 3 to 80 characters."}</code></p>
  </section>
</main>
</body>
</html>`;
}

app.get("/", (req, res) => {
  const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
  res.status(200).type("html").send(guidePage(baseUrl.replace(/\/+$/, "")));
});

/* ---------- GET /health : server + database check ---------- */
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Health check failed:", error.message);
    res.status(503).json({ status: "error", database: "unavailable", message: "Database check failed." });
  }
});

/* ---------- Record routes ---------- */
app.use("/api/records", require("./routes/records"));

/* ---------- Unknown routes: JSON 404 ---------- */
app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

/* ---------- Error handler (4 parameters) ---------- */
// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  // Malformed JSON in the request body
  if (error.type === "entity.parse.failed" || (error instanceof SyntaxError && error.status === 400)) {
    return res.status(400).json({ message: "Malformed JSON in request body." });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body is too large." });
  }
  if (error.status >= 400 && error.status < 500) {
    return res.status(error.status).json({ message: "The request could not be processed." });
  }

  // Anything else: log the details here, send a clear message to the client
  console.error(`Unexpected error on ${req.method} ${req.originalUrl}:`, error);
  res.status(500).json({ message: "Unexpected server error. Please try again later." });
});

/* ---------- Start ---------- */
const port = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(port, "0.0.0.0", () => {
    console.log(`Server listening on port ${port}`);
    pool.query("SELECT 1")
      .then(() => console.log("Database connection OK"))
      .catch((error) => console.error("Database connection FAILED:", error.message));
  });
}

module.exports = app;
