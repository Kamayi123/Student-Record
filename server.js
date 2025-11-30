import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureDataFiles } from './src/storage.js';
import { addStudent, listStudents, findStudent, updateStudentStatus } from './src/students.js';
import { markAttendance, listAttendance } from './src/attendance.js';
import { addActivity, listActivities } from './src/activities.js';
import { generateStudentsReport, generateAttendanceReport, generateActivitiesReport, generateStudentSummaryReport } from './src/reports.js';
import { login, requireAuthMiddleware } from './src/auth.js';
import { logInfo, logError } from './src/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

await ensureDataFiles();

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Auth
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  try {
    const { token } = login(username, password);
    res.json({ token });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// Protected routes middleware
app.use('/api', requireAuthMiddleware);

// Students
app.get('/api/students', async (req, res) => {
  try {
    const { status } = req.query;
    const rows = await listStudents({ status });
    res.json(rows);
  } catch (err) { sendError(res, err); }
});

app.post('/api/students', async (req, res) => {
  try {
    const { name, email, year, cohort, status } = req.body;
    const student = await addStudent({ name, email, year, cohort, status });
    res.status(201).json(student);
  } catch (err) { sendError(res, err, 400); }
});

app.get('/api/students/:id', async (req, res) => {
  try {
    const student = await findStudent({ id: req.params.id });
    if (!student) return res.status(404).json({ error: 'Not found' });
    res.json(student);
  } catch (err) { sendError(res, err); }
});

app.patch('/api/students/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await updateStudentStatus(req.params.id, status);
    res.json(updated);
  } catch (err) { sendError(res, err, 400); }
});

// Attendance
app.get('/api/attendance', async (req, res) => {
  try {
    const rows = await listAttendance({ studentId: req.query.studentId, from: req.query.from, to: req.query.to });
    res.json(rows);
  } catch (err) { sendError(res, err); }
});

app.post('/api/attendance', async (req, res) => {
  try {
    const rec = await markAttendance(req.body);
    res.status(201).json(rec);
  } catch (err) { sendError(res, err, 400); }
});

// Activities
app.get('/api/activities', async (req, res) => {
  try {
    const rows = await listActivities({ studentId: req.query.studentId, from: req.query.from, to: req.query.to });
    res.json(rows);
  } catch (err) { sendError(res, err); }
});

app.post('/api/activities', async (req, res) => {
  try {
    const rec = await addActivity(req.body);
    res.status(201).json(rec);
  } catch (err) { sendError(res, err, 400); }
});

// Reports
app.get('/api/reports/students', async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    if (format === 'json') {
      const students = await listStudents({});
      res.json(students);
    } else {
      const out = await generateStudentsReport({ format });
      res.download(out);
    }
  } catch (err) { sendError(res, err); }
});

app.get('/api/reports/attendance', async (req, res) => {
  try {
    const { format = 'json', from, to, studentId } = req.query;
    if (format === 'json') {
      const rows = await listAttendance({ studentId, from, to });
      res.json(rows);
    } else {
      const out = await generateAttendanceReport({ format, from, to, studentId });
      res.download(out);
    }
  } catch (err) { sendError(res, err); }
});

app.get('/api/reports/activities', async (req, res) => {
  try {
    const { format = 'json', from, to, studentId } = req.query;
    if (format === 'json') {
      const rows = await listActivities({ studentId, from, to });
      res.json(rows);
    } else {
      const out = await generateActivitiesReport({ format, from, to, studentId });
      res.download(out);
    }
  } catch (err) { sendError(res, err); }
});

app.get('/api/reports/student-summary/:id', async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const out = await generateStudentSummaryReport({ studentId: req.params.id, format });
    if (format === 'json') {
      // Read file and send JSON
      const json = await import('fs').then(m => JSON.parse(m.readFileSync(out, 'utf-8')));
      res.json(json);
    } else { res.download(out); }
  } catch (err) { sendError(res, err); }
});

// Static fallback -> serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function sendError(res, err, status = 500) {
  logError(err.stack || String(err));
  res.status(status).json({ error: err.message || String(err) });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logInfo(`Server started on port ${PORT}`);
  console.log(`Web app running: http://localhost:${PORT}`);
});
