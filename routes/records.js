// routes/records.js: the five record routes, mounted at /api/records in server.js.
// All SQL uses placeholders ($1, $2 ...) so user input is never joined into the SQL text.
const router = require("express").Router();
const pool = require("../db");

const STATUSES = ["Pending", "In progress", "Completed"];
const LIMITS = {
  title:       { label: "Title",       min: 3, max: 80 },
  category:    { label: "Category",    min: 2, max: 40 },
  description: { label: "Description", min: 5, max: 300 }
};
const MAX_ID = 2147483647; // largest value the INTEGER id column can hold
const COLUMNS = "id, title, category, description, status";

/* ---------- Helpers ---------- */

// Returns a positive whole number, or null when the id is not one.
function parseId(value) {
  if (!/^[1-9][0-9]*$/.test(String(value))) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function badId(res) {
  return res.status(400).json({ message: "Id must be a positive whole number." });
}

function notFound(res) {
  return res.status(404).json({ message: "Record not found." });
}

// Checks the body sent by POST and PUT. Any client-supplied id is ignored.
// Returns { values } when valid, or { message } with the first problem found.
function validateBody(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return {
      message: "Request body must be a JSON object with title, category, description and status " +
               "(send Content-Type: application/json)."
    };
  }

  const values = {};
  for (const [field, rule] of Object.entries(LIMITS)) {
    const raw = body[field];
    if (raw === undefined || raw === null) return { message: `${rule.label} is required.` };
    if (typeof raw !== "string") return { message: `${rule.label} must be a string.` }; // check type BEFORE trimming
    const text = raw.trim();
    if (text.length === 0) return { message: `${rule.label} is required and cannot be spaces only.` };
    if (text.includes("\u0000")) return { message: `${rule.label} contains invalid characters.` };
    const length = Array.from(text).length; // counts characters the same way the database does
    if (length < rule.min || length > rule.max) {
      return { message: `${rule.label} must have ${rule.min} to ${rule.max} characters.` };
    }
    values[field] = text;
  }

  if (body.status === undefined || body.status === null) return { message: "Status is required." };
  if (typeof body.status !== "string") return { message: "Status must be a string." };
  const status = body.status.trim();
  if (!STATUSES.includes(status)) {
    return { message: "Status must be Pending, In progress or Completed." };
  }
  values.status = status;

  return { values };
}

/* ---------- GET /api/records : all records ---------- */
router.get("/", async (req, res, next) => {
  try {
    const result = await pool.query(`SELECT ${COLUMNS} FROM records ORDER BY id`);
    res.status(200).json(result.rows); // [] when there are none
  } catch (error) {
    next(error);
  }
});

/* ---------- GET /api/records/:id : one record ---------- */
router.get("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return badId(res);
    if (id > MAX_ID) return notFound(res);

    const result = await pool.query(`SELECT ${COLUMNS} FROM records WHERE id = $1`, [id]);
    if (result.rowCount === 0) return notFound(res);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/* ---------- POST /api/records : create ---------- */
router.post("/", async (req, res, next) => {
  try {
    const { values, message } = validateBody(req.body);
    if (message) return res.status(400).json({ message });

    const result = await pool.query(
      "INSERT INTO records (title, category, description, status) " +
      `VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS}`,
      [values.title, values.category, values.description, values.status]
    );
    res.status(201).json(result.rows[0]); // includes the new id
  } catch (error) {
    next(error);
  }
});

/* ---------- PUT /api/records/:id : replace the four editable fields ---------- */
router.put("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return badId(res);

    const { values, message } = validateBody(req.body);
    if (message) return res.status(400).json({ message });
    if (id > MAX_ID) return notFound(res);

    const result = await pool.query(
      "UPDATE records SET title = $1, category = $2, description = $3, status = $4 " +
      `WHERE id = $5 RETURNING ${COLUMNS}`,
      [values.title, values.category, values.description, values.status, id]
    );
    if (result.rowCount === 0) return notFound(res); // PUT never creates a missing record
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/* ---------- DELETE /api/records/:id ---------- */
router.delete("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return badId(res);
    if (id > MAX_ID) return notFound(res);

    const result = await pool.query("DELETE FROM records WHERE id = $1 RETURNING id", [id]);
    if (result.rowCount === 0) return notFound(res);
    res.status(200).json({ message: "Record deleted." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
