# Student Record System (JavaScript CLI)

A lightweight, file-based application providing both a CLI and a local web interface to:
- Register learners (students)
- Mark attendance
- Track student activities
- Generate reports as CSV or JSON files

All data is stored locally as JSON files under `data/`, with logs in `logs/` and generated reports in `reports/`.

## Quick Start (CLI - Windows PowerShell)

Prerequisites:
- Node.js 16+ installed (LTS recommended)

CLI Commands:
```powershell
# Show help
node index.js --help

# Add students
node index.js student add --name "Alice Johnson" --email "alice@example.com" --year "2025"
node index.js student add --name "Bob Smith" --email "bob@example.com" --cohort "2025A"

# List students
node index.js student list

# Find a student's id by email
$aliceId = node index.js student find --email "alice@example.com" --get id

# Mark attendance
node index.js attendance mark --studentId $aliceId --date 2025-11-30 --status present --note "On time"

# Add an activity
node index.js activity add --studentId $aliceId --type assignment --description "Math HW1"

# List attendance and activities
node index.js attendance list --studentId $aliceId --from 2025-11-01 --to 2025-11-30
node index.js activity list --studentId $aliceId

# Generate reports (written to the reports/ folder)
node index.js report students --format csv
node index.js report attendance --format csv --from 2025-11-01 --to 2025-11-30
node index.js report activities --format json --studentId $aliceId
node index.js report student-summary --studentId $aliceId --format json
```

Web App (browser):
```powershell
# Install dependencies and start web server
npm install
npm start
# Then open http://localhost:3000 in your browser
```

- Admin login: choose Admin role, credentials `admin / password`.
- Student self-registration: choose Student role → Register → fill Name, Email, Year, Password. Then login as Student to see your records.
- Admin can add students, mark attendance, and add activities from the dashboard. Students see read-only views of their own attendance and activities.

Note: On first run, the app auto-creates `data/` files.

## Design Choices
- Simplicity first: zero external dependencies, synchronous file IO for predictable behavior in a CLI.
- Local, auditable storage: JSON files in `data/` for portability and easy backups.
- Clear separation of concerns:
  - `src/students.js` for student registry
  - `src/attendance.js` for attendance marking and queries
  - `src/activities.js` for activity tracking
  - `src/reports.js` for report generation (CSV/JSON)
  - `src/storage.js` for data file access
  - `src/logger.js` for file-based logging (`logs/app.log`)
  - `src/auth.js` for simple role-based auth (admin + student sessions)
  - `src/utils.js` for argument parsing, CSV formatting, and helpers
- Cross-platform safe: avoids shell-specific syntax inside npm scripts; examples are provided for Windows PowerShell.

## Data Model
- Students (`data/students.json`):
  - `{ id, name, email, year, status, enrolledOn, auth? }` (older records may have `cohort`; the app normalizes to `year`). If the student registered, `auth` includes `{ salt, hash }`.
- Attendance (`data/attendance.json`):
  - `{ id, studentId, date(YYYY-MM-DD), status(present|absent|late), note }`
- Activities (`data/activities.json`):
  - `{ id, studentId, timestamp(ISO), type(assignment|quiz|participation|other), description }`

## Reports
- Students: CSV or JSON of all students
- Attendance: filter by date range and/or student; CSV/JSON
- Activities: filter by date/time range and/or student; CSV/JSON
- Student summary: per-student aggregate; JSON or CSV metrics

Files are written under `reports/`. You can override output path with `--out <path>`.

## Logging
- Events are logged to `logs/app.log` as ISO timestamps with levels INFO/ERROR.

## Implementation Notes
- Minimal custom CLI parser in `utils.parseArgs` for flags like `--name`, `--email`, etc.
- IDs use Node's `crypto.randomUUID()` when available, with a safe fallback.
- Dates use ISO formats; attendance dates require `YYYY-MM-DD`.

## Testing the Program
- Use the commands above to create students, mark attendance, add activities, and generate reports.
- Inspect `data/*.json` to verify persisted records.
- Open files in `reports/` to validate generated outputs.
 - For the web app, try registering a new student, then login as Student and verify "Recent Attendance" shows only their own records.

## Troubleshooting
- If Node is not recognized, install it from https://nodejs.org
- If a command errors, see `logs/app.log` for details.
- Ensure you're running commands from the project folder: `Student Record`.

## License
MIT

## Web App Usage

### Start the server
```powershell
node server.js
```
Then open: http://localhost:3000 in your browser.

### Login
Default credentials: `admin / password` (configure with env vars `ADMIN_USER`, `ADMIN_PASS`).

### Features in Browser
After login you can:
- Add students
- Mark attendance
- Add activities
- View counts and recent records
- (API endpoints allow report downloads: e.g. `/api/reports/students?format=csv`)

### REST API Overview (Authorization: `Bearer <token>`)
- `POST /api/login` -> `{ token }`
- `GET /api/students` / `POST /api/students`
- `GET /api/students/:id` / `PATCH /api/students/:id/status`
- `GET /api/attendance` (query: `studentId`, `from`, `to`) / `POST /api/attendance`
- `GET /api/activities` (query: `studentId`, `from`, `to`) / `POST /api/activities`
- Reports:
  - `GET /api/reports/students?format=csv|json`
  - `GET /api/reports/attendance?studentId=&from=&to=&format=`
  - `GET /api/reports/activities?studentId=&from=&to=&format=`
  - `GET /api/reports/student-summary/:id?format=csv|json`

### Example PowerShell API Test
```powershell
$resp = Invoke-RestMethod -Uri http://localhost:3000/api/login -Method POST -Body (@{username='admin';password='password'} | ConvertTo-Json) -ContentType 'application/json'
$token = $resp.token
Invoke-RestMethod -Uri http://localhost:3000/api/students -Headers @{Authorization="Bearer $token"}
```

### Notes
- In-memory sessions: restart server invalidates tokens.
- Static frontend in `public/` keeps JS simple (no framework).
- Replace auth strategy before any production deployment.
