import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID as uuid } from 'crypto';
import { fileURLToPath } from 'url';

export function parseArgs(args) {
  const out = { _: [] };
  let i = 0;
  while (i < args.length) {
    const token = args[i];
    if (token.startsWith('--')) {
      const key = token.replace(/^--/, '');
      const next = args[i + 1];
      if (!next || next.startsWith('--')) {
        out[key] = true;
        i += 1;
      } else {
        out[key] = next;
        i += 2;
      }
    } else {
      out._.push(token);
      i += 1;
    }
  }
  return out;
}

export function exitWithMessage(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

export function printTable(rows, columns) {
  if (!rows || rows.length === 0) {
    console.log('(no results)');
    return;
  }
  const widths = {};
  for (const col of columns) {
    widths[col] = col.length;
  }
  for (const row of rows) {
    for (const col of columns) {
      const val = row[col] != null ? String(row[col]) : '';
      widths[col] = Math.max(widths[col], val.length);
    }
  }
  const header = columns.map(c => pad(c, widths[c])).join('  ');
  const sep = columns.map(c => '-'.repeat(widths[c])).join('  ');
  console.log(header);
  console.log(sep);
  for (const row of rows) {
    console.log(columns.map(c => pad(row[c] != null ? String(row[c]) : '', widths[c])).join('  '));
  }
}

function pad(s, w) {
  return String(s).padEnd(w, ' ');
}

export function today() {
  const d = new Date();
  return formatDate(d);
}

export function formatDate(d) {
  const dt = (d instanceof Date) ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isValidDateStr(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s).getTime());
}

export function generateId() {
  try { return uuid(); } catch {}
  return 'id-' + Math.random().toString(36).slice(2) + Date.now();
}

export function ensureDirSync(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

export function toCSV(rows, columns) {
  const esc = v => {
    const s = v == null ? '' : String(v);
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const header = columns.join(',');
  const body = rows.map(r => columns.map(c => esc(r[c])).join(',')).join(os.EOL);
  return header + os.EOL + body + os.EOL;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT = path.resolve(__dirname, '..');
export const DATA_DIR = path.join(ROOT, 'data');
export const LOGS_DIR = path.join(ROOT, 'logs');
export const REPORTS_DIR = path.join(ROOT, 'reports');
