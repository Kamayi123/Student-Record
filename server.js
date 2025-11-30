import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureDataFiles } from './src/storage.js';
import { addStudent, listStudents, findStudent, updateStudentStatus } from './src/students.js';
import { markAttendance, listAttendance } from './src/attendance.js';
import { addActivity, listActivities } from './src/activities.js';
import { generateStudentsReport, generateAttendanceReport, generateActivitiesReport, generateStudentSummaryReport } from './src/reports.js';
import { login, loginStudent, registerStudent, requireAuthMiddleware, adminOnly, studentOnly } from './src/auth.js';
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

// Student auth (public)
app.post('/api/students/register', async (req, res) => {
  try {
    const { name, email, year, password } = req.body || {};
    const s = await registerStudent({ name, email, year, password });
    res.status(201).json({ id: s.id, email: s.email, name: s.name, year: s.year });
  } catch (err) { sendError(res, err, 400); }
});

app.post('/api/students/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const session = await loginStudent(email, password);
    res.json(session);
  } catch (err) { sendError(res, err, 401); }
});

// Protected routes middleware
app.use('/api', requireAuthMiddleware);

// Students
app.get('/api/students', adminOnly, async (req, res) => {
  try {
    const { status } = req.query;
    const rows = await listStudents({ status });
    res.json(rows);
  } catch (err) { sendError(res, err); }
});

app.post('/api/students', adminOnly, async (req, res) => {
  try {
    const { name, email, year, cohort, status } = req.body;
    const student = await addStudent({ name, email, year, cohort, status });
    res.status(201).json(student);
  } catch (err) { sendError(res, err, 400); }
});

app.get('/api/students/:id', adminOnly, async (req, res) => {
  try {
    const student = await findStudent({ id: req.params.id });
    if (!student) return res.status(404).json({ error: 'Not found' });
    res.json(student);
  } catch (err) { sendError(res, err); }
});

app.patch('/api/students/:id/status', adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await updateStudentStatus(req.params.id, status);
    res.json(updated);
  } catch (err) { sendError(res, err, 400); }
});

// Attendance
app.get('/api/attendance', adminOnly, async (req, res) => {
  try {
    const rows = await listAttendance({ studentId: req.query.studentId, from: req.query.from, to: req.query.to });
    res.json(rows);
  } catch (err) { sendError(res, err); }
});

app.post('/api/attendance', adminOnly, async (req, res) => {
  try {
    const rec = await markAttendance(req.body);
    res.status(201).json(rec);
  } catch (err) { sendError(res, err, 400); }
});

// Activities
app.get('/api/activities', adminOnly, async (req, res) => {
  try {
    const rows = await listActivities({ studentId: req.query.studentId, from: req.query.from, to: req.query.to });
    res.json(rows);
  } catch (err) { sendError(res, err); }
});

app.post('/api/activities', adminOnly, async (req, res) => {
  try {
    const rec = await addActivity(req.body);
    res.status(201).json(rec);
  } catch (err) { sendError(res, err, 400); }
});

// Reports
app.get('/api/reports/students', adminOnly, async (req, res) => {
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

app.get('/api/reports/attendance', adminOnly, async (req, res) => {
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

app.get('/api/reports/activities', adminOnly, async (req, res) => {
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

app.get('/api/reports/student-summary/:id', adminOnly, async (req, res) => {
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

// Student self-service endpoints
app.get('/api/me', async (req, res) => {
  if (req.session?.role === 'student') {
    const s = await (await import('./src/students.js')).findStudent({ id: req.session.studentId });
    return res.json({ role: 'student', student: s });
  }
  if (req.session?.role === 'admin') return res.json({ role: 'admin', user: req.session.username });
  return res.json({ role: 'guest' });
});

app.get('/api/my/attendance', studentOnly, async (req, res) => {
  const rows = await listAttendance({ studentId: req.session.studentId });
  res.json(rows);
});

app.get('/api/my/activities', studentOnly, async (req, res) => {
  const rows = await listActivities({ studentId: req.session.studentId });
  res.json(rows);
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
