import { readJSON, writeJSON } from './storage.js';
import { generateId } from './utils.js';
import { findStudent } from './students.js';
import { logInfo } from './logger.js';

export async function addActivity({ studentId, type, description }) {
  if (!studentId) throw new Error('studentId required');
  type = String(type || '').toLowerCase();
  if (!['assignment', 'quiz', 'participation', 'other'].includes(type)) throw new Error('type must be assignment|quiz|participation|other');
  if (!description) throw new Error('description required');

  const student = await findStudent({ id: studentId });
  if (!student) throw new Error('Student not found');

  const rec = {
    id: generateId(),
    studentId,
    timestamp: new Date().toISOString(),
    type,
    description,
  };
  const data = await readJSON('activities');
  data.push(rec);
  await writeJSON('activities', data);
  logInfo(`Activity added ${studentId} ${type}`);
  return rec;
}

export async function listActivities({ studentId, from, to } = {}) {
  const data = await readJSON('activities');
  return data.filter(r => {
    const inStudent = !studentId || r.studentId === studentId;
    const ts = r.timestamp;
    const inFrom = !from || ts >= from;
    const inTo = !to || ts <= (to.length === 10 ? to + 'T23:59:59.999Z' : to);
    return inStudent && inFrom && inTo;
  });
}
