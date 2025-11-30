import fs from 'fs';
import path from 'path';
import { DATA_DIR, ensureDirSync } from './utils.js';

const FILES = {
  students: path.join(DATA_DIR, 'students.json'),
  attendance: path.join(DATA_DIR, 'attendance.json'),
  activities: path.join(DATA_DIR, 'activities.json'),
};

export async function ensureDataFiles() {
  ensureDirSync(DATA_DIR);
  for (const key of Object.keys(FILES)) {
    const p = FILES[key];
    if (!fs.existsSync(p)) {
      fs.writeFileSync(p, '[]', 'utf-8');
    }
  }
}

export async function readJSON(key) {
  const p = FILES[key];
  const txt = fs.readFileSync(p, 'utf-8');
  return JSON.parse(txt || '[]');
}

export async function writeJSON(key, data) {
  const p = FILES[key];
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
}
