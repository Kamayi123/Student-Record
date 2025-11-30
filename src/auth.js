
import crypto from 'crypto';
import { readJSON, writeJSON } from './storage.js';
import { addStudent, findStudent } from './students.js';

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'password';

const sessions = new Map(); // token -> { role: 'admin'|'student', username?, studentId?, issuedAt }

function hashPassword(password, salt) {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, s, 10000, 32, 'sha256').toString('hex');
  return { salt: s, hash };
}

function verifyPassword(password, record) {
  if (!record?.salt || !record?.hash) return false;
  const h = crypto.pbkdf2Sync(password, record.salt, 10000, 32, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(record.hash, 'hex'));
}

export function login(username, password) {
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = crypto.randomUUID();
    sessions.set(token, { role: 'admin', username, issuedAt: Date.now() });
    return { token };
  }
  throw new Error('Invalid credentials');
}

export async function registerStudent({ name, email, year, password }) {
  if (!email || !password) throw new Error('email and password required');
  let student = await findStudent({ email: String(email).toLowerCase() });
  if (student) {
    if (student.auth && student.auth.hash) throw new Error('Email already registered');
    // Claim existing student: set auth and optionally name/year
    const students = await readJSON('students');
    const idx = students.findIndex(s => s.id === student.id);
    const creds = hashPassword(password);
    students[idx].auth = creds;
    if (name) students[idx].name = name;
    if (year) students[idx].year = year;
    await writeJSON('students', students);
    return students[idx];
  } else {
    student = await addStudent({ name, email, year, status: 'active' });
    const students = await readJSON('students');
    const idx = students.findIndex(s => s.id === student.id);
    students[idx].auth = hashPassword(password);
    await writeJSON('students', students);
    return students[idx];
  }
}

export async function loginStudent(email, password) {
  const student = await findStudent({ email: String(email).toLowerCase() });
  if (!student) throw new Error('Invalid credentials');
  if (!verifyPassword(password, student.auth)) throw new Error('Invalid credentials');
  const token = crypto.randomUUID();
  sessions.set(token, { role: 'student', studentId: student.id, issuedAt: Date.now() });
  return { token, studentId: student.id };
}

export function authenticateToken(token) {
  if (!token) return null;
  const s = sessions.get(token);
  return s || null;
}

export function requireAuthMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const session = authenticateToken(token);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  req.session = session;
  next();
}

export function adminOnly(req, res, next) {
  if (req.session?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
}

export function studentOnly(req, res, next) {
  if (req.session?.role !== 'student') return res.status(403).json({ error: 'Forbidden' });
  next();
}
