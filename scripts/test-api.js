// scripts/test-api.js: runs the Step 7 test table against a running API.
// Usage:  npm run test:api                          (tests http://localhost:3000)
//         npm run test:api -- https://your-backend.onrender.com
// Needs Node 18 or newer. No extra packages. Records it creates are deleted at the end.

const BASE = (process.argv[2] || process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const GOOD = {
  title: "API test: broken classroom light",
  category: "Electrical",
  description: "The light in Room B12 does not switch on.",
  status: "Pending"
};

let passed = 0;
let failed = 0;
const created = [];

async function call(method, path, body, rawBody) {
  const options = { method, headers: {}, signal: AbortSignal.timeout(60000) }; // allow a slow cold start
  if (body !== undefined || rawBody !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = rawBody !== undefined ? rawBody : JSON.stringify(body);
  }
  const response = await fetch(BASE + path, options);
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: response.status, json, text, type: response.headers.get("content-type") || "" };
}

function check(name, condition, detail = "") {
  if (condition) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}${detail ? "  -> " + detail : ""}`); }
}

const hasMessage = (r) => r.json && typeof r.json.message === "string" && r.json.message.length > 0;
const show = (r) => `status ${r.status}, body ${r.text.slice(0, 120)}`;

async function main() {
  console.log(`Testing ${BASE}\n`);

  console.log("Guide and health");
  let r = await call("GET", "/");
  check("GET / returns an HTML guide (200)", r.status === 200 && r.type.includes("text/html") && r.text.includes("/api/records"), show(r));
  r = await call("GET", "/health");
  check("GET /health returns 200 and a database check", r.status === 200 && r.json && r.json.database === "connected", show(r));

  console.log("\nRead all");
  r = await call("GET", "/api/records");
  check("GET /api/records returns 200 and an array", r.status === 200 && Array.isArray(r.json), show(r));
  const before = Array.isArray(r.json) ? r.json.length : -1;
  check("records have id, title, category, description, status",
    !Array.isArray(r.json) || r.json.length === 0 ||
    ["id", "title", "category", "description", "status"].every((k) => k in r.json[0]));

  console.log("\nCreate, read, update, delete");
  r = await call("POST", "/api/records", GOOD);
  check("POST valid body returns 201 and a new id", r.status === 201 && Number.isInteger(r.json && r.json.id), show(r));
  const id = r.json && r.json.id;
  if (id) created.push(id);
  check("POST response has the saved values", r.json && r.json.title === GOOD.title && r.json.status === "Pending");

  r = await call("GET", `/api/records/${id}`);
  check("GET one returns 200 and the exact record", r.status === 200 && r.json && r.json.id === id && r.json.title === GOOD.title && r.json.description === GOOD.description, show(r));

  const changed = { title: "API test: light now fixed", category: "Electrical", description: "The light in Room B12 was replaced.", status: "Completed" };
  r = await call("PUT", `/api/records/${id}`, changed);
  check("PUT returns 200 with changed values and the original id", r.status === 200 && r.json && r.json.id === id && r.json.title === changed.title && r.json.status === "Completed", show(r));
  r = await call("GET", `/api/records/${id}`);
  check("GET after PUT shows the change", r.json && r.json.status === "Completed");

  r = await call("DELETE", `/api/records/${id}`);
  check('DELETE returns 200 and {"message":"Record deleted."}', r.status === 200 && r.json && r.json.message === "Record deleted.", show(r));
  r = await call("GET", `/api/records/${id}`);
  check("GET the deleted id returns 404", r.status === 404 && hasMessage(r), show(r));
  created.length = 0;

  console.log("\nTrimming and ignored id");
  r = await call("POST", "/api/records", { id: 99999, title: "  Spaced title  ", category: " Plumbing ", description: "  Tap leaks badly  ", status: " In progress " });
  if (r.json && r.json.id) created.push(r.json.id);
  check("text is trimmed before saving", r.status === 201 && r.json.title === "Spaced title" && r.json.category === "Plumbing" && r.json.description === "Tap leaks badly" && r.json.status === "In progress", show(r));
  check("client-supplied id is ignored", r.status === 201 && r.json.id !== 99999, show(r));

  console.log("\nInvalid input returns 400 and creates nothing");
  const countBeforeBad = (await call("GET", "/api/records")).json.length;
  const bad = [
    ["missing title", { ...GOOD, title: undefined }],
    ["title spaces only", { ...GOOD, title: "     " }],
    ["title too short", { ...GOOD, title: "ab" }],
    ["title too long (81)", { ...GOOD, title: "x".repeat(81) }],
    ["category too short", { ...GOOD, category: "a" }],
    ["category too long (41)", { ...GOOD, category: "c".repeat(41) }],
    ["description too short", { ...GOOD, description: "abcd" }],
    ["description too long (301)", { ...GOOD, description: "d".repeat(301) }],
    ["invalid status", { ...GOOD, status: "Done" }],
    ["status wrong case", { ...GOOD, status: "pending" }],
    ["missing status", { ...GOOD, status: undefined }],
    ["title is a number", { ...GOOD, title: 12345 }],
    ["description is an object", { ...GOOD, description: { a: 1 } }]
  ];
  for (const [name, body] of bad) {
    r = await call("POST", "/api/records", body);
    check(`POST ${name} -> 400 with a message`, r.status === 400 && hasMessage(r), show(r));
  }
  r = await call("POST", "/api/records", undefined, '["not","an","object"]');
  check("POST a JSON array -> 400", r.status === 400 && hasMessage(r), show(r));
  const countAfterBad = (await call("GET", "/api/records")).json.length;
  check("no rows were created by the invalid requests", countAfterBad === countBeforeBad, `before ${countBeforeBad}, after ${countAfterBad}`);
  r = await call("POST", "/api/records", { ...GOOD, title: "x".repeat(80) });
  check("title of exactly 80 characters is accepted", r.status === 201, show(r));
  if (r.json && r.json.id) created.push(r.json.id);

  console.log("\nInvalid ids and malformed JSON return 400");
  for (const badId of ["abc", "0", "-1", "1.5", "1e3"]) {
    r = await call("GET", `/api/records/${badId}`);
    check(`GET /api/records/${badId} -> 400`, r.status === 400 && hasMessage(r), show(r));
  }
  r = await call("PUT", "/api/records/abc", GOOD);
  check("PUT invalid id -> 400", r.status === 400 && hasMessage(r), show(r));
  r = await call("DELETE", "/api/records/abc");
  check("DELETE invalid id -> 400", r.status === 400 && hasMessage(r), show(r));
  r = await call("POST", "/api/records", undefined, '{"title": "Broken light", ');
  check("POST malformed JSON -> 400 JSON message", r.status === 400 && hasMessage(r), show(r));
  r = await call("PUT", "/api/records/1", undefined, "{not json");
  check("PUT malformed JSON -> 400 JSON message", r.status === 400 && hasMessage(r), show(r));

  console.log("\nPositive ids that do not exist return 404");
  const missing = 987654321;
  r = await call("GET", `/api/records/${missing}`);
  check("GET missing id -> 404", r.status === 404 && hasMessage(r), show(r));
  r = await call("PUT", `/api/records/${missing}`, GOOD);
  check("PUT missing id -> 404 (does not create)", r.status === 404 && hasMessage(r), show(r));
  r = await call("GET", `/api/records/${missing}`);
  check("PUT did not create the record", r.status === 404);
  r = await call("DELETE", `/api/records/${missing}`);
  check("DELETE missing id -> 404", r.status === 404 && hasMessage(r), show(r));
  r = await call("GET", "/api/records/99999999999999999999");
  check("GET huge id -> 404 (no server error)", r.status === 404 || r.status === 400, show(r));

  console.log("\nUnknown routes");
  r = await call("GET", "/nothing-here");
  check("unknown route -> 404 JSON", r.status === 404 && hasMessage(r), show(r));

  // Clean up everything this script created
  for (const leftover of created) await call("DELETE", `/api/records/${leftover}`);

  console.log(`\n${passed} passed, ${failed} failed.`);
  console.log("Manual test still to do: create a record, restart the server, then GET it. It must still exist.");
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(`\nCould not reach ${BASE}: ${error.message}`);
  console.error("Is the server running? For a hosted service, wait a minute and try again.");
  process.exitCode = 1;
});
