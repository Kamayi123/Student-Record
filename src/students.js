import { readJSON, writeJSON } from './storage.js';
import { generateId, formatDate } from './utils.js';
import { logInfo } from './logger.js';

// Add a new student
export async function addStudent({ name, email, year, cohort, status = 'active' }) {
  name = String(name).trim();
  email = String(email).trim().toLowerCase();
  if (!name) throw new Error('Name is required');
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Valid email is required');
  if (!['active', 'inactive'].includes(status)) throw new Error('Status must be active|inactive');
  // Backward compatibility: allow cohort param but store as year
  const normalizedYear = (year ?? cohort ?? 'general');

  const students = await readJSON('students');
  if (students.find(s => s.email === email)) throw new Error('Email already exists');

  const student = {
    id: generateId(),
    name,
    email,
    year: normalizedYear,
    status,
    enrolledOn: formatDate(new Date()),
  };
  students.push(student);
  await writeJSON('students', students);
  logInfo(`Student created ${student.id} ${student.email}`);
  return student;
}

export async function listStudents({ status } = {}) {
  const students = await readJSON('students');
  return status ? students.filter(s => s.status === status) : students;
}

export async function findStudent({ id, email } = {}) {
  const students = await readJSON('students');
  return students.find(s => (id && s.id === id) || (email && s.email === email));
}

export async function updateStudentStatus(id, status) {
  if (!['active', 'inactive'].includes(status)) throw new Error('Status must be active|inactive');
  const students = await readJSON('students');
  const idx = students.findIndex(s => s.id === id);
  if (idx === -1) throw new Error('Student not found');
  students[idx].status = status;
  await writeJSON('students', students);
  logInfo(`Student status updated ${id} => ${status}`);
  return students[idx];
}
