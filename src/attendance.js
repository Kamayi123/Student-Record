import { readJSON, writeJSON } from './storage.js';
import { generateId, isValidDateStr } from './utils.js';
import { findStudent } from './students.js';
import { logInfo } from './logger.js';

export async function markAttendance({ studentId, date, status, note = '' }) {
  if (!studentId) throw new Error('studentId required');
  if (!isValidDateStr(date)) throw new Error('date must be YYYY-MM-DD');
  if (!['present', 'absent', 'late'].includes(status)) throw new Error('status must be present|absent|late');

  const student = await findStudent({ id: studentId });
  if (!student) throw new Error('Student not found');

  const rec = {
    id: generateId(),
    studentId,
    date,
    status,
    note,
  };
  const data = await readJSON('attendance');
  data.push(rec);
  await writeJSON('attendance', data);
  logInfo(`Attendance marked ${studentId} ${date} ${status}`);
  return rec;
}

export async function listAttendance({ studentId, from, to } = {}) {
  const data = await readJSON('attendance');
  return data.filter(r => (
    (!studentId || r.studentId === studentId) &&
    (!from || r.date >= from) &&
    (!to || r.date <= to)
  ));
}
