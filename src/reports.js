import fs from 'fs';
import path from 'path';
import { readJSON } from './storage.js';
import { REPORTS_DIR, ensureDirSync, toCSV } from './utils.js';

export async function generateStudentsReport({ format = 'csv', outPath } = {}) {
  const students = await readJSON('students');
  ensureDirSync(REPORTS_DIR);
  const filename = outPath || path.join(REPORTS_DIR, `students.${format}`);
  // Normalize to include year, even if older records used 'cohort'
  const rows = students.map(s => ({ ...s, year: s.year ?? s.cohort }));
  const columns = ['id', 'name', 'email', 'year', 'status', 'enrolledOn'];
  writeReport(filename, format, rows, columns);
  return filename;
}

export async function generateAttendanceReport({ format = 'csv', from, to, studentId, outPath } = {}) {
  const data = await readJSON('attendance');
  const rows = data.filter(r => (
    (!studentId || r.studentId === studentId) &&
    (!from || r.date >= from) &&
    (!to || r.date <= to)
  ));
  ensureDirSync(REPORTS_DIR);
  const filename = outPath || path.join(REPORTS_DIR, `attendance${studentId ? '-' + studentId : ''}.${format}`);
  const columns = ['id', 'studentId', 'date', 'status', 'note'];
  writeReport(filename, format, rows, columns);
  return filename;
}

export async function generateActivitiesReport({ format = 'csv', from, to, studentId, outPath } = {}) {
  const data = await readJSON('activities');
  const rows = data.filter(r => {
    const inStudent = !studentId || r.studentId === studentId;
    const ts = r.timestamp;
    const inFrom = !from || ts >= from;
    const inTo = !to || ts <= (to?.length === 10 ? to + 'T23:59:59.999Z' : to);
    return inStudent && inFrom && inTo;
  });
  ensureDirSync(REPORTS_DIR);
  const filename = outPath || path.join(REPORTS_DIR, `activities${studentId ? '-' + studentId : ''}.${format}`);
  const columns = ['id', 'studentId', 'timestamp', 'type', 'description'];
  writeReport(filename, format, rows, columns);
  return filename;
}

export async function generateStudentSummaryReport({ studentId, format = 'json', outPath } = {}) {
  if (!studentId) throw new Error('studentId required');
  const students = await readJSON('students');
  const s = students.find(x => x.id === studentId);
  if (!s) throw new Error('Student not found');
  const attendance = (await readJSON('attendance')).filter(r => r.studentId === studentId);
  const activities = (await readJSON('activities')).filter(r => r.studentId === studentId);

  const present = attendance.filter(a => a.status === 'present').length;
  const absent = attendance.filter(a => a.status === 'absent').length;
  const late = attendance.filter(a => a.status === 'late').length;

  const summary = {
    student: s,
    counts: {
      attendance: attendance.length,
      present, absent, late,
      activities: activities.length,
    },
    attendance,
    activities,
  };

  ensureDirSync(REPORTS_DIR);
  const filename = outPath || path.join(REPORTS_DIR, `student-summary-${studentId}.${format}`);
  if (format === 'json') {
    fs.writeFileSync(filename, JSON.stringify(summary, null, 2), 'utf-8');
  } else if (format === 'csv') {
    const rows = [
      { metric: 'attendance_total', value: attendance.length },
      { metric: 'present', value: present },
      { metric: 'absent', value: absent },
      { metric: 'late', value: late },
      { metric: 'activities_total', value: activities.length },
    ];
    const csv = toCSV(rows, ['metric', 'value']);
    fs.writeFileSync(filename, csv, 'utf-8');
  } else {
    throw new Error('format must be json|csv');
  }
  return filename;
}

function writeReport(filename, format, rows, columns) {
  if (format === 'json') {
    fs.writeFileSync(filename, JSON.stringify(rows, null, 2), 'utf-8');
  } else if (format === 'csv') {
    const csv = toCSV(rows, columns);
    fs.writeFileSync(filename, csv, 'utf-8');
  } else {
    throw new Error('format must be json|csv');
  }
}
