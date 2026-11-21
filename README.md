# Activity 7: Campus Maintenance Requests API

ICT251 Introduction to Web Technologies, Mulungushi University.
An independent Node.js + Express backend with a PostgreSQL database. It has no frontend and works with any client (Postman, curl, a browser, or the Activity 8 frontend).

## What is in this folder

```
activity7-backend/
├── server.js              Express app, middleware, API guide page (GET /), /health, error handlers
├── routes/
│   └── records.js         The five record routes + validation
├── db.js                  PostgreSQL connection pool
├── schema.sql             Creates the records table
├── seed.sql               Inserts 10 made-up records (only if the table is empty)
├── scripts/
│   ├── setup-db.js        `npm run db:setup` runs schema.sql then seed.sql for you
│   └── test-api.js        `npm run test:api` runs the whole Step 7 test table
├── postman_collection.json  Import into Postman (same tests, ready to click)
├── .env                   Your local settings (never uploaded to Git)
├── .env.example           A template of .env
├── .gitignore             Keeps .env and node_modules out of Git
├── package.json / package-lock.json
└── README.md
```

> **Database note.** The Activity 7 PDF mentions "SQL lite" in two places, but its commands install `pg`, use `$1` placeholders and `DATABASE_URL`, and it says Render's local files are temporary. Those all point to PostgreSQL, so this project uses PostgreSQL. If your lecturer wants SQLite instead, ask them first; the routes would need rewriting.

---

## Part 1: Run it on your computer

### 1. Install Node.js
Install the **LTS** version from nodejs.org, then check:
```
node -v
npm -v
```
(On Windows PowerShell, if `npm` is blocked, type `npm.cmd` instead of `npm`.)

### 2. Get a PostgreSQL database
Pick ONE option. You need a connection URL that looks like `postgresql://USER:PASSWORD@HOST:5432/DATABASE`.

- **Option A, hosted (easiest, and you need one for hosting anyway):** create a free PostgreSQL database on Render (New + > PostgreSQL) or another provider such as Neon. Copy its **External Database URL**. Check the provider's current plan limits (some free databases expire or are deleted after a period).
- **Option B, on your computer:** install PostgreSQL from postgresql.org, then create a database called `maintenance` (for example in pgAdmin). Your URL will be like `postgresql://postgres:YOUR_PASSWORD@localhost:5432/maintenance`.

### 3. Install the packages
Open a terminal **inside the `activity7-backend` folder** and run:
```
npm install
```

### 4. Edit `.env`
Open `.env` and set:
```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
CLIENT_ORIGINS=http://127.0.0.1:5500,http://localhost:5500
STUDENT_NUMBER=your real student number
```
`STUDENT_NUMBER` appears on the API guide page, which the marker needs to see.

### 5. Create the table and starting records
```
npm run db:setup
```
You should see `Done. The records table now has 10 record(s).` You can run it again safely; it will not create duplicates.
(You can instead paste `schema.sql` and then `seed.sql` into any SQL client.)

### 6. Start the server
```
npm start
```
Open http://localhost:3000 (the API guide) and http://localhost:3000/api/records. Stop the server with **Ctrl+C**.

---

## Part 2: Test it without the frontend

### Option 1: automatic script
With the server running, in a **second** terminal:
```
npm run test:api
```
It runs the whole Step 7 table (CRUD, validation, 400/404 cases) and prints PASS or FAIL for each. To test a hosted API:
```
npm run test:api -- https://your-backend.onrender.com
```

### Option 2: Postman
1. Postman > Import > choose `postman_collection.json`.
2. Open the collection's **Variables** tab and set `baseUrl` (for example `http://localhost:3000`).
3. Run requests 1 to 17 in order. Each has built-in checks.

### The restart test (do this by hand)
1. POST a record and note its id.
2. Stop the server (Ctrl+C) and start it again with `npm start`.
3. `GET /api/records/<id>`. The record must still be there, because it lives in the database.

---

## Part 3: Host it on Render

1. **GitHub:** create a repository and upload this folder, including `package.json` and `package-lock.json` but **not** `.env` or `node_modules` (`.gitignore` already excludes them).
   ```
   git init
   git add .
   git commit -m "Activity 7 backend"
   git branch -M main
   git remote add origin https://github.com/YOUR-NAME/activity7-backend.git
   git push -u origin main
   ```
2. **Database on Render:** New + > PostgreSQL. Wait until it is available. Copy the **Internal Database URL** (for the web service) and the **External Database URL** (to set up tables from your computer).
3. **Create the tables in the hosted database.** On your computer, in the project folder, run `npm run db:setup` with the **External** URL:
   - PowerShell: `$env:DATABASE_URL="PASTE-EXTERNAL-URL"; npm run db:setup`
   - Command Prompt: `set DATABASE_URL=PASTE-EXTERNAL-URL && npm run db:setup`
   - Mac/Linux: `DATABASE_URL="PASTE-EXTERNAL-URL" npm run db:setup`
4. **Web service:** New + > Web Service > connect your repository.
   - Root directory: the backend folder (leave empty if the repo is only the backend)
   - Runtime: Node
   - Build command: `npm install`
   - Start command: `npm start`
   - Instance type: Free
5. **Environment variables** on the web service:
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the Internal Database URL |
   | `STUDENT_NUMBER` | your student number |
   | `CLIENT_ORIGINS` | leave empty for now (set it in Activity 8) |
6. Deploy, read the logs (you should see `Database connection OK`), then open your service URL such as `https://your-backend.onrender.com`.
7. Check `/health`, then run `npm run test:api -- https://your-backend.onrender.com` and repeat the restart test (Render > Manual Deploy > Restart service).
8. **Submit** the base URL only (no `/api/records` on the end).

A free Render service sleeps when idle, so the first request can take up to a minute. The guide page says this too.

---

## Activity 8 (connecting the frontend)

Browsers only let your frontend call this API if its address is allowed. In `.env` locally and in Render's environment variables, put every frontend address in `CLIENT_ORIGINS`, separated by commas and with no trailing slash:
```
CLIENT_ORIGINS=http://127.0.0.1:5500,http://localhost:5500,https://your-frontend.netlify.app
```
Restart or redeploy after changing it. Reading a URL in the browser address bar does not need CORS; calls from your frontend's JavaScript do.

## API summary

| Method | Route | Success |
|---|---|---|
| GET | `/` | 200 HTML guide |
| GET | `/health` | 200 (503 if the database fails) |
| GET | `/api/records` | 200 array (`[]` when empty) |
| GET | `/api/records/:id` | 200 record |
| POST | `/api/records` | 201 saved record with new id |
| PUT | `/api/records/:id` | 200 updated record, same id |
| DELETE | `/api/records/:id` | 200 `{"message":"Record deleted."}` |

Body for POST and PUT (all four fields, no `id`):
```json
{
  "title": "Broken classroom light",
  "category": "Electrical",
  "description": "The light in Room B12 does not switch on.",
  "status": "Pending"
}
```
Errors are JSON with a `message`: **400** invalid input, invalid id or malformed JSON; **404** record or route not found; **500** unexpected failure; **503** health check only.

## Troubleshooting

| Problem | Fix |
|---|---|
| `Missing script: "start"` or `missing package.json` | Your terminal is in the wrong folder. `cd` into `activity7-backend`. |
| `Cannot find module 'express'` | Run `npm install` first. |
| `ECONNREFUSED` or `Database connection FAILED` | Wrong or missing `DATABASE_URL`, or PostgreSQL is not running. |
| `The server does not support SSL connections` | Add `DATABASE_SSL=false` to your environment. |
| `no pg_hba.conf entry ... no encryption` | Add `DATABASE_SSL=true`. |
| `relation "records" does not exist` | Run `npm run db:setup` against that database. |
| Frontend request blocked by CORS | Add the frontend address to `CLIENT_ORIGINS` and restart. |
| First request to Render is very slow | The free service was asleep. Wait and retry. |
